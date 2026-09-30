import "server-only";

import { prisma } from "../db/prisma";
import { buildRequirementReminders } from "../reminders/rules";

export async function listEmployees(query?: string, status?: string) {
  const lifecycleStatuses = ["ACTIVE", "ONBOARDING", "TERMINATED"] as const;
  const lifecycleStatus = lifecycleStatuses.find((value) => value === status);
  return prisma.employee.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
              { employeeNumber: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status && status !== "ALL"
        ? status === "NOT_CLEARED"
          ? { clearanceStatus: "NOT_CLEARED" as const }
          : lifecycleStatus
            ? { status: lifecycleStatus }
            : {}
        : {}),
    },
    include: {
      jobRole: { select: { name: true, department: true } },
      requirements: {
        where: { active: true },
        select: {
          status: true,
          requiredBeforeWork: true,
          conditional: true,
          conditionSatisfied: true,
          expires: true,
          expirationDate: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getEmployeeProfile(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      jobRole: true,
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      requirements: {
        where: { active: true },
        include: {
          requirement: true,
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } },
          documents: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
              uploadedBy: { select: { name: true } },
            },
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: [{ requiredBeforeWork: "desc" }, { requirement: { name: "asc" } }],
      },
      auditLogs: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
}

export async function getEmployeeFormOptions() {
  const [roles, supervisors] = await Promise.all([
    prisma.jobRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      select: { id: true, firstName: true, lastName: true, jobRole: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);
  return { roles, supervisors };
}

export async function getDashboardData() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const inThirtyDays = new Date(today);
  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);

  const [active, onboarding, notCleared, expired, expiring, pendingReview, recentEmployees, reminderAssignments] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.employee.count({ where: { status: "ONBOARDING" } }),
      prisma.employee.count({ where: { clearanceStatus: "NOT_CLEARED", status: { not: "TERMINATED" } } }),
      prisma.employeeRequirement.count({
        where: { active: true, expires: true, expirationDate: { lt: today } },
      }),
      prisma.employeeRequirement.count({
        where: { active: true, status: "APPROVED", expirationDate: { gte: today, lte: inThirtyDays } },
      }),
      prisma.employeeRequirement.count({ where: { active: true, status: "PENDING_REVIEW" } }),
      prisma.employee.findMany({
        where: { status: { not: "TERMINATED" } },
        include: { jobRole: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.employeeRequirement.findMany({
        where: { active: true, employee: { status: { not: "TERMINATED" } } },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          requirement: { select: { name: true } },
        },
      }),
    ]);

  const reminders = reminderAssignments.flatMap((assignment) =>
    buildRequirementReminders({
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
      rejectionReason: assignment.rejectionReason,
    }).map((reminder) => ({
      ...reminder,
      employee: assignment.employee,
    })),
  );
  const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  reminders.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const openReminders = reminders.length;
  const urgentReminders = reminders.filter((item) => item.priority === "CRITICAL" || item.priority === "HIGH").length;

  return { active, onboarding, notCleared, expired, expiring, pendingReview, recentEmployees, openReminders, urgentReminders, reminders: reminders.slice(0, 4) };
}

export async function getComplianceQueue() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const inThirtyDays = new Date(today);
  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);

  const [pendingReview, expired, expiring] = await Promise.all([
    prisma.employeeRequirement.findMany({
      where: { active: true, status: "PENDING_REVIEW" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requirement: { select: { name: true, requirementType: true } },
        documents: {
          where: { status: "ACTIVE" },
          select: { id: true, fileName: true, uploadedAt: true },
          orderBy: { uploadedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.employeeRequirement.findMany({
      where: { active: true, expires: true, expirationDate: { lt: today } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requirement: { select: { name: true, requirementType: true } },
      },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.employeeRequirement.findMany({
      where: { active: true, status: "APPROVED", expirationDate: { gte: today, lte: inThirtyDays } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requirement: { select: { name: true, requirementType: true } },
      },
      orderBy: { expirationDate: "asc" },
    }),
  ]);

  return { pendingReview, expired, expiring };
}
