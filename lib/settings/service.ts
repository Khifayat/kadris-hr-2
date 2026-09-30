import "server-only";

import type { Prisma } from "../../generated/prisma/client";
import { isConditionSatisfied } from "../compliance";
import { refreshEmployeeClearance } from "../compliance/refresh";
import { prisma } from "../db/prisma";
import {
  createJobRoleSchema,
  createRequirementSchema,
  parseReminderDays,
  roleRequirementSchema,
} from "./schema";

type SettingsTx = Prisma.TransactionClient;

function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

async function syncRoleRequirementToEmployees(
  tx: SettingsTx,
  mapping: {
    jobRoleId: string;
    requirementId: string;
    requiredBeforeWork: boolean;
    conditional: boolean;
    conditionKey: string | null;
    requirement: {
      requiresApproval: boolean;
      expires: boolean;
      reminderDays: number[];
    };
  },
  actorId: string,
) {
  const employees = await tx.employee.findMany({
    where: { jobRoleId: mapping.jobRoleId, status: { not: "TERMINATED" } },
    select: {
      id: true,
      transportsParticipants: true,
      performsMedicationDuties: true,
    },
  });

  for (const employee of employees) {
    const conditionSatisfied = isConditionSatisfied(mapping.conditional, mapping.conditionKey, employee);
    await tx.employeeRequirement.upsert({
      where: {
        employeeId_requirementId: {
          employeeId: employee.id,
          requirementId: mapping.requirementId,
        },
      },
      update: {
        active: true,
        requiredBeforeWork: mapping.requiredBeforeWork,
        conditional: mapping.conditional,
        conditionSatisfied,
        requiresApproval: mapping.requirement.requiresApproval,
        expires: mapping.requirement.expires,
        reminderDays: mapping.requirement.reminderDays,
      },
      create: {
        employeeId: employee.id,
        requirementId: mapping.requirementId,
        requiredBeforeWork: mapping.requiredBeforeWork,
        conditional: mapping.conditional,
        conditionSatisfied,
        requiresApproval: mapping.requirement.requiresApproval,
        expires: mapping.requirement.expires,
        reminderDays: mapping.requirement.reminderDays,
      },
    });
    await refreshEmployeeClearance(tx, employee.id, actorId);
  }
}

export async function createJobRole(formData: FormData, actorId: string) {
  const input = createJobRoleSchema.parse({
    name: formData.get("name"),
    department: formData.get("department"),
    description: formData.get("description"),
  });

  const role = await prisma.jobRole.create({ data: input });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "JOB_ROLE_CREATED",
      entityType: "JobRole",
      entityId: role.id,
      newValue: input,
    },
  });
  return role.id;
}

export async function createRequirement(formData: FormData, actorId: string) {
  const input = createRequirementSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    requirementType: formData.get("requirementType"),
    expires: checkbox(formData, "expires"),
    expirationPeriodDays: formData.get("expirationPeriodDays") || undefined,
    requiresApproval: formData.get("requiresApproval") !== "off",
    reminderDays: formData.get("reminderDays") || "60,30,7",
  });
  const reminderDays = parseReminderDays(input.reminderDays);

  const requirement = await prisma.requirement.create({
    data: {
      name: input.name,
      description: input.description,
      requirementType: input.requirementType,
      expires: input.expires,
      expirationPeriodDays: input.expires ? input.expirationPeriodDays : null,
      requiresApproval: input.requiresApproval,
      reminderDays: reminderDays.length ? reminderDays : [60, 30, 7],
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "REQUIREMENT_CREATED",
      entityType: "Requirement",
      entityId: requirement.id,
      newValue: { ...input, reminderDays },
    },
  });
  return requirement.id;
}

export async function upsertRoleRequirement(formData: FormData, actorId: string) {
  const input = roleRequirementSchema.parse({
    jobRoleId: formData.get("jobRoleId"),
    requirementId: formData.get("requirementId"),
    requiredBeforeWork: checkbox(formData, "requiredBeforeWork"),
    conditionKey: formData.get("conditionKey") || "",
  });

  await prisma.$transaction(async (tx) => {
    const requirement = await tx.requirement.findFirst({
      where: { id: input.requirementId, active: true },
      select: { id: true, name: true, requiresApproval: true, expires: true, reminderDays: true },
    });
    if (!requirement) throw new Error("Requirement not found.");

    const role = await tx.jobRole.findFirst({
      where: { id: input.jobRoleId, active: true },
      select: { id: true, name: true },
    });
    if (!role) throw new Error("Role not found.");

    const conditional = input.conditionKey !== "";
    const mapping = await tx.jobRoleRequirement.upsert({
      where: {
        jobRoleId_requirementId: {
          jobRoleId: input.jobRoleId,
          requirementId: input.requirementId,
        },
      },
      update: {
        active: true,
        requiredBeforeWork: input.requiredBeforeWork,
        conditional,
        conditionKey: conditional ? input.conditionKey : null,
        conditionDescription: conditional
          ? input.conditionKey === "TRANSPORTS_PARTICIPANTS"
            ? "Required when the employee transports participants"
            : "Required when the employee performs medication-related duties"
          : null,
      },
      create: {
        jobRoleId: input.jobRoleId,
        requirementId: input.requirementId,
        requiredBeforeWork: input.requiredBeforeWork,
        conditional,
        conditionKey: conditional ? input.conditionKey : null,
        conditionDescription: conditional
          ? input.conditionKey === "TRANSPORTS_PARTICIPANTS"
            ? "Required when the employee transports participants"
            : "Required when the employee performs medication-related duties"
          : null,
      },
      include: { requirement: { select: { requiresApproval: true, expires: true, reminderDays: true } } },
    });

    await syncRoleRequirementToEmployees(tx, mapping, actorId);
    await tx.auditLog.create({
      data: {
        actorId,
        action: "ROLE_REQUIREMENT_UPSERTED",
        entityType: "JobRoleRequirement",
        entityId: mapping.id,
        newValue: {
          roleName: role.name,
          requirementName: requirement.name,
          requiredBeforeWork: input.requiredBeforeWork,
          conditionKey: input.conditionKey || null,
        },
      },
    });
  });

  return input.jobRoleId;
}

export async function removeRoleRequirement(formData: FormData, actorId: string) {
  const mappingId = formData.get("mappingId");
  if (typeof mappingId !== "string" || !mappingId) throw new Error("Mapping is required.");

  return prisma.$transaction(async (tx) => {
    const mapping = await tx.jobRoleRequirement.findUnique({
      where: { id: mappingId },
      include: { requirement: { select: { name: true } }, jobRole: { select: { name: true } } },
    });
    if (!mapping) throw new Error("Role requirement not found.");

    await tx.jobRoleRequirement.update({ where: { id: mappingId }, data: { active: false } });
    const assignments = await tx.employeeRequirement.updateManyAndReturn({
      where: {
        requirementId: mapping.requirementId,
        employee: { jobRoleId: mapping.jobRoleId },
        active: true,
      },
      data: { active: false },
      select: { employeeId: true },
    });

    for (const employeeId of [...new Set(assignments.map((item) => item.employeeId))]) {
      await refreshEmployeeClearance(tx, employeeId, actorId);
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ROLE_REQUIREMENT_REMOVED",
        entityType: "JobRoleRequirement",
        entityId: mapping.id,
        oldValue: { roleName: mapping.jobRole.name, requirementName: mapping.requirement.name },
      },
    });
    return mapping.jobRoleId;
  });
}
