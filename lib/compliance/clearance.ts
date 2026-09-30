import { categorizeExpiration } from "./expiration";
import type {
  ClearanceReason,
  ClearanceResult,
  ComplianceRequirement,
} from "./types";

export function isApplicable(requirement: ComplianceRequirement): boolean {
  return requirement.active && (!requirement.conditional || requirement.conditionSatisfied);
}

export function getMissingRequirements(
  requirements: readonly ComplianceRequirement[],
): ComplianceRequirement[] {
  return requirements.filter(
    (requirement) =>
      isApplicable(requirement) && requirement.status === "NOT_STARTED",
  );
}

export function getExpiredRequirements(
  requirements: readonly ComplianceRequirement[],
  now: Date = new Date(),
): ComplianceRequirement[] {
  return requirements.filter((requirement) => {
    if (!isApplicable(requirement)) return false;
    if (requirement.status === "EXPIRED") return true;
    return (
      requirement.expires &&
      requirement.expirationDate !== null &&
      categorizeExpiration(requirement.expirationDate, requirement.reminderDays, now).category ===
        "EXPIRED"
    );
  });
}

export function getExpiringRequirements(
  requirements: readonly ComplianceRequirement[],
  now: Date = new Date(),
): ComplianceRequirement[] {
  return requirements.filter(
    (requirement) =>
      isApplicable(requirement) &&
      requirement.status === "APPROVED" &&
      requirement.expires &&
      requirement.expirationDate !== null &&
      categorizeExpiration(requirement.expirationDate, requirement.reminderDays, now).category ===
        "EXPIRING_SOON",
  );
}

function reasonFor(
  requirement: ComplianceRequirement,
  now: Date,
): ClearanceReason | null {
  const base = { requirementId: requirement.id, requirement: requirement.name };

  if (requirement.status === "NOT_STARTED") return { ...base, reason: "MISSING" };
  if (requirement.status === "PENDING_REVIEW") return { ...base, reason: "PENDING_REVIEW" };
  if (requirement.status === "REJECTED") return { ...base, reason: "REJECTED" };
  if (requirement.status === "EXPIRED") return { ...base, reason: "EXPIRED" };
  if (requirement.expires && requirement.expirationDate === null) {
    return { ...base, reason: "MISSING_EXPIRATION" };
  }
  if (
    requirement.expirationDate &&
    categorizeExpiration(requirement.expirationDate, requirement.reminderDays, now).category ===
      "EXPIRED"
  ) {
    return { ...base, reason: "EXPIRED" };
  }
  return null;
}

export function calculateEmployeeClearance(
  requirements: readonly ComplianceRequirement[],
  now: Date = new Date(),
): ClearanceResult {
  const blockers = requirements.filter(
    (requirement) => isApplicable(requirement) && requirement.requiredBeforeWork,
  );

  const reasons: ClearanceReason[] = blockers
    .map((requirement) => reasonFor(requirement, now))
    .filter((reason): reason is ClearanceReason => reason !== null);

  if (blockers.length === 0) {
    reasons.push({
      requirementId: null,
      requirement: "Role configuration",
      reason: "NO_REQUIRED_REQUIREMENTS",
    });
  }

  const cleared = blockers.length > 0 && reasons.length === 0;
  return {
    cleared,
    status: cleared ? "CLEARED" : "NOT_CLEARED",
    evaluatedAt: now,
    reasons,
  };
}

export function canEmployeeWork(
  requirements: readonly ComplianceRequirement[],
  now: Date = new Date(),
): boolean {
  return calculateEmployeeClearance(requirements, now).cleared;
}
