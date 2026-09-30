import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().trim().min(3, "Employee number is required").max(30),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email address").max(254),
  phone: z.string().trim().max(30).optional().transform((value) => value || undefined),
  jobRoleId: z.string().trim().min(1, "Select a job role"),
  supervisorId: z.string().trim().optional().transform((value) => value || undefined),
  hireDate: z.coerce.date(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "PRN", "CONTRACTOR", "TEMPORARY"]),
  transportsParticipants: z.boolean().default(false),
  performsMedicationDuties: z.boolean().default(false),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
