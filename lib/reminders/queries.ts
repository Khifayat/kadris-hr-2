import "server-only";

import type { AppUser } from "../auth/session";
import { prisma } from "../db/prisma";
import { canReadHrWorkspace } from "../permissions/roles";
import { buildRequirementReminders } from "./rules";
import type { ComplianceReminder } from "./types";

const priorityOrder: Record<ComplianceReminder["priority"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const audienceOrder: Record<ComplianceReminder["audience"], number> = {
  HR: 0,
  EMPLOYEE: 1,
};

export async function getReminderInbox(user: AppUser) {
  const isHr = canReadHrWorkspace(user.role);
  const assignments = await prisma.employeeRequirement.findMany({
    where: {
      active: true,
      employee: isHr ? { status: { not: "TERMINATED" } } : { id: user.employeeId ?? "__NO_EMPLOYEE__" },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          email: true,
        },
      },
      requirement: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const reminders = assignments.flatMap((assignment) =>
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
      updatedAt: assignment.updatedAt,
      href: isHr ? `/employees/${assignment.employee.id}` : "/my-requirements",
    })),
  );

  reminders.sort((a, b) => {
    const priority = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priority !== 0) return priority;
    const audience = audienceOrder[a.audience] - audienceOrder[b.audience];
    if (audience !== 0) return audience;
    return a.employee.lastName.localeCompare(b.employee.lastName);
  });

  return {
    reminders,
    critical: reminders.filter((item) => item.priority === "CRITICAL").length,
    high: reminders.filter((item) => item.priority === "HIGH").length,
    hrReview: reminders.filter((item) => item.audience === "HR").length,
    employeeAction: reminders.filter((item) => item.audience === "EMPLOYEE").length,
  };
}
