import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { calculateEmployeeClearance, isConditionSatisfied } from "../compliance";
import { prisma } from "../db/prisma";
import type { CreateEmployeeInput } from "./schema";

export async function createEmployeeWithRequirements(
  input: CreateEmployeeInput,
  actorId: string,
): Promise<{ employeeId: string; userId: string }> {
  return prisma.$transaction(async (tx) => {
    const role = await tx.jobRole.findFirst({
      where: { id: input.jobRoleId, active: true },
      include: {
        requirements: {
          where: { active: true, requirement: { active: true } },
          include: { requirement: true },
        },
      },
    });
    if (!role) throw new Error("The selected job role is no longer available.");

    if (input.supervisorId) {
      const supervisor = await tx.employee.findFirst({
        where: { id: input.supervisorId, status: { not: "TERMINATED" } },
        select: { id: true },
      });
      if (!supervisor) throw new Error("The selected supervisor is no longer available.");
    }

    const employee = await tx.employee.create({
      data: {
        employeeNumber: input.employeeNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        jobRoleId: role.id,
        supervisorId: input.supervisorId,
        hireDate: input.hireDate,
        employmentType: input.employmentType,
        transportsParticipants: input.transportsParticipants,
        performsMedicationDuties: input.performsMedicationDuties,
      },
    });

    const existingUser = await tx.user.findUnique({ where: { email: employee.email } });
    if (existingUser?.employeeId && existingUser.employeeId !== employee.id) {
      throw new Error("That email address is already linked to another employee account.");
    }
    const appUser = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: { employeeId: employee.id } })
      : await tx.user.create({
          data: {
            authProviderId: `pending:${randomUUID()}`,
            email: employee.email,
            name: `${employee.firstName} ${employee.lastName}`,
            role: "EMPLOYEE",
            employeeId: employee.id,
          },
        });

    const assignments = await Promise.all(
      role.requirements.map((mapping) =>
        tx.employeeRequirement.create({
          data: {
            employeeId: employee.id,
            requirementId: mapping.requirementId,
            requiredBeforeWork: mapping.requiredBeforeWork,
            conditional: mapping.conditional,
            conditionSatisfied: isConditionSatisfied(mapping.conditional, mapping.conditionKey, input),
            requiresApproval: mapping.requirement.requiresApproval,
            expires: mapping.requirement.expires,
            reminderDays: mapping.requirement.reminderDays,
          },
          include: { requirement: { select: { name: true } } },
        }),
      ),
    );

    const evaluatedAt = new Date();
    const clearance = calculateEmployeeClearance(
      assignments.map((assignment) => ({
        id: assignment.id,
        name: assignment.requirement.name,
        status: assignment.status,
        active: assignment.active,
        requiredBeforeWork: assignment.requiredBeforeWork,
        conditional: assignment.conditional,
        conditionSatisfied: assignment.conditionSatisfied,
        expires: assignment.expires,
        expirationDate: assignment.expirationDate,
        reminderDays: assignment.reminderDays,
      })),
      evaluatedAt,
    );

    await tx.employee.update({
      where: { id: employee.id },
      data: {
        clearanceStatus: clearance.status,
        clearanceCalculatedAt: evaluatedAt,
        clearedAt: clearance.cleared ? evaluatedAt : null,
      },
    });

    const auditEntries: Prisma.AuditLogCreateManyInput[] = [
      {
        actorId,
        employeeId: employee.id,
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: employee.id,
        newValue: {
          employeeNumber: employee.employeeNumber,
          jobRoleId: role.id,
          status: employee.status,
        },
      },
      {
        actorId,
        employeeId: employee.id,
        action: existingUser ? "USER_LINKED_TO_EMPLOYEE" : "USER_CREATED",
        entityType: "User",
        entityId: appUser.id,
        newValue: { email: appUser.email, role: appUser.role, employeeId: employee.id },
      },
      ...assignments.map((assignment) => ({
        actorId,
        employeeId: employee.id,
        action: "REQUIREMENT_ASSIGNED",
        entityType: "EmployeeRequirement",
        entityId: assignment.id,
        newValue: {
          requirementId: assignment.requirementId,
          requirementName: assignment.requirement.name,
          requiredBeforeWork: assignment.requiredBeforeWork,
          conditionSatisfied: assignment.conditionSatisfied,
        },
      })),
    ];
    await tx.auditLog.createMany({ data: auditEntries });
    await tx.clearanceEvent.create({
      data: {
        employeeId: employee.id,
        fromStatus: null,
        toStatus: clearance.status,
        reasons: clearance.reasons,
        triggeredByUserId: actorId,
      },
    });

    return { employeeId: employee.id, userId: appUser.id };
  });
}
