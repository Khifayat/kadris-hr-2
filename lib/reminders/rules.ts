import { categorizeExpiration, isApplicable } from "../compliance";
import type { ComplianceReminder, ReminderRequirement } from "./types";

function priorityForDays(daysRemaining: number): ComplianceReminder["priority"] {
  if (daysRemaining < 0) return "CRITICAL";
  if (daysRemaining <= 7) return "HIGH";
  if (daysRemaining <= 30) return "MEDIUM";
  return "LOW";
}

export function buildRequirementReminders(
  requirement: ReminderRequirement,
  now: Date = new Date(),
): ComplianceReminder[] {
  if (!isApplicable(requirement)) return [];

  const base = {
    requirementId: requirement.id,
    daysRemaining: null,
  };

  if (requirement.status === "NOT_STARTED") {
    return [{
      ...base,
      id: `${requirement.id}:missing`,
      kind: "MISSING_DOCUMENT",
      audience: "EMPLOYEE",
      priority: requirement.requiredBeforeWork ? "HIGH" : "MEDIUM",
      title: `${requirement.name} is missing`,
      detail: requirement.requiredBeforeWork
        ? "Submit this before the employee can be cleared to work."
        : "Submit this post-hire requirement.",
    }];
  }

  if (requirement.status === "REJECTED") {
    return [{
      ...base,
      id: `${requirement.id}:rejected`,
      kind: "REJECTED_DOCUMENT",
      audience: "EMPLOYEE",
      priority: "HIGH",
      title: `${requirement.name} was rejected`,
      detail: requirement.rejectionReason || "Review the reason and resubmit the document.",
    }];
  }

  if (requirement.status === "PENDING_REVIEW") {
    return [{
      ...base,
      id: `${requirement.id}:pending-review`,
      kind: "PENDING_REVIEW",
      audience: "HR",
      priority: requirement.requiredBeforeWork ? "HIGH" : "MEDIUM",
      title: `${requirement.name} needs HR review`,
      detail: "Approve or reject the submitted document.",
    }];
  }

  if (requirement.status === "EXPIRED") {
    return [{
      ...base,
      id: `${requirement.id}:expired-status`,
      kind: "EXPIRED_DOCUMENT",
      audience: "EMPLOYEE",
      priority: "CRITICAL",
      title: `${requirement.name} is expired`,
      detail: "Submit an updated document for HR review.",
    }];
  }

  if (requirement.expires && requirement.expirationDate) {
    const expiration = categorizeExpiration(requirement.expirationDate, requirement.reminderDays, now);
    if (expiration.category === "EXPIRED") {
      return [{
        ...base,
        id: `${requirement.id}:expired`,
        kind: "EXPIRED_DOCUMENT",
        audience: "EMPLOYEE",
        priority: "CRITICAL",
        title: `${requirement.name} is expired`,
        detail: "Submit an updated document for HR review.",
        daysRemaining: expiration.daysRemaining,
      }];
    }
    if (expiration.category === "EXPIRING_SOON") {
      return [{
        ...base,
        id: `${requirement.id}:expiring`,
        kind: "EXPIRING_DOCUMENT",
        audience: "EMPLOYEE",
        priority: priorityForDays(expiration.daysRemaining),
        title: `${requirement.name} expires soon`,
        detail: `Renew this requirement in ${expiration.daysRemaining} day${expiration.daysRemaining === 1 ? "" : "s"}.`,
        daysRemaining: expiration.daysRemaining,
      }];
    }
  }

  return [];
}
