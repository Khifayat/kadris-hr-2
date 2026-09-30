import { z } from "zod";

export const CONDITION_OPTIONS = [
  { value: "", label: "Always required" },
  { value: "TRANSPORTS_PARTICIPANTS", label: "Only if transports participants" },
  { value: "PERFORMS_MEDICATION_DUTIES", label: "Only if performs medication duties" },
] as const;

export const createJobRoleSchema = z.object({
  name: z.string().trim().min(2, "Role name is required").max(120),
  department: z.string().trim().min(2, "Department is required").max(120),
  description: z.string().trim().max(500).optional().transform((value) => value || undefined),
});

export const createRequirementSchema = z.object({
  name: z.string().trim().min(2, "Requirement name is required").max(160),
  description: z.string().trim().max(700).optional().transform((value) => value || undefined),
  requirementType: z.enum([
    "DOCUMENT",
    "BACKGROUND_CHECK",
    "CERTIFICATION",
    "TRAINING",
    "ACKNOWLEDGEMENT",
    "HEALTH_SCREENING",
    "OTHER",
  ]),
  expires: z.boolean().default(false),
  expirationPeriodDays: z.coerce.number().int().positive().optional(),
  requiresApproval: z.boolean().default(true),
  reminderDays: z.string().trim().default("60,30,7"),
}).superRefine((value, ctx) => {
  if (!value.expires && value.expirationPeriodDays) {
    ctx.addIssue({ code: "custom", path: ["expirationPeriodDays"], message: "Only set an expiration period when the requirement expires." });
  }
});

export const roleRequirementSchema = z.object({
  jobRoleId: z.string().trim().min(1, "Select a role"),
  requirementId: z.string().trim().min(1, "Select a requirement"),
  requiredBeforeWork: z.boolean().default(false),
  conditionKey: z.enum(["", "TRANSPORTS_PARTICIPANTS", "PERFORMS_MEDICATION_DUTIES"]).default(""),
});

export type CreateJobRoleInput = z.infer<typeof createJobRoleSchema>;
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type RoleRequirementInput = z.infer<typeof roleRequirementSchema>;

export function parseReminderDays(value: string): number[] {
  const parsed = value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  return [...new Set(parsed)].sort((a, b) => b - a);
}
