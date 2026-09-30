import { z } from "zod";

export const userRoles = ["OWNER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"] as const;

const optionalEmployeeId = z.string().trim().optional().transform((value) => value || null);

export const createAppUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2, "Name is required").max(160),
  role: z.enum(userRoles),
  employeeId: optionalEmployeeId,
});

export const updateAppUserSchema = createAppUserSchema.extend({
  userId: z.string().trim().min(1, "User is required"),
});

export type CreateAppUserInput = z.infer<typeof createAppUserSchema>;
export type UpdateAppUserInput = z.infer<typeof updateAppUserSchema>;
