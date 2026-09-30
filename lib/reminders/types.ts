export type ReminderAudience = "HR" | "EMPLOYEE";
export type ReminderPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ReminderKind =
  | "MISSING_DOCUMENT"
  | "REJECTED_DOCUMENT"
  | "PENDING_REVIEW"
  | "EXPIRED_DOCUMENT"
  | "EXPIRING_DOCUMENT";

export type ReminderRequirement = {
  id: string;
  name: string;
  status: "NOT_STARTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  active: boolean;
  requiredBeforeWork: boolean;
  conditional: boolean;
  conditionSatisfied: boolean;
  expires: boolean;
  expirationDate: Date | null;
  reminderDays: readonly number[];
  rejectionReason?: string | null;
};

export type ComplianceReminder = {
  id: string;
  kind: ReminderKind;
  audience: ReminderAudience;
  priority: ReminderPriority;
  title: string;
  detail: string;
  requirementId: string;
  daysRemaining: number | null;
};
