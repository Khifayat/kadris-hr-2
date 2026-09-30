export const REQUIREMENT_STATUSES = [
  "NOT_STARTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export type ComplianceRequirement = {
  id: string;
  name: string;
  status: RequirementStatus;
  active: boolean;
  requiredBeforeWork: boolean;
  conditional: boolean;
  conditionSatisfied: boolean;
  expires: boolean;
  expirationDate: Date | null;
  reminderDays: readonly number[];
};

export type ClearanceReasonCode =
  | "MISSING"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "EXPIRED"
  | "MISSING_EXPIRATION"
  | "NO_REQUIRED_REQUIREMENTS";

export type ClearanceReason = {
  requirementId: string | null;
  requirement: string;
  reason: ClearanceReasonCode;
};

export type ClearanceResult = {
  cleared: boolean;
  status: "CLEARED" | "NOT_CLEARED";
  evaluatedAt: Date;
  reasons: ClearanceReason[];
};

export type ExpirationCategory = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export type ExpirationResult = {
  category: ExpirationCategory;
  daysRemaining: number;
  nextReminderDay: number | null;
};
