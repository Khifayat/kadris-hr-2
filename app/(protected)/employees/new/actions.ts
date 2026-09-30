"use server";

import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createEmployeeSchema } from "@/lib/employees/schema";
import { createEmployeeWithRequirements } from "@/lib/employees/service";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";

export type CreateEmployeeState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createEmployeeAction(
  _previousState: CreateEmployeeState,
  formData: FormData,
): Promise<CreateEmployeeState> {
  const actor = await requireRole(HR_WRITE_ROLES);
  const parsed = createEmployeeSchema.safeParse({
    employeeNumber: formData.get("employeeNumber"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    jobRoleId: formData.get("jobRoleId"),
    supervisorId: formData.get("supervisorId"),
    hireDate: formData.get("hireDate"),
    employmentType: formData.get("employmentType"),
    transportsParticipants: formData.get("transportsParticipants") === "on",
    performsMedicationDuties: formData.get("performsMedicationDuties") === "on",
  });

  if (!parsed.success) {
    return { error: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let employeeId: string;
  try {
    employeeId = await createEmployeeWithRequirements(parsed.data, actor.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An employee already uses that employee number or email address." };
    }
    return { error: error instanceof Error ? error.message : "Unable to create the employee." };
  }

  redirect(`/employees/${employeeId}`);
}
