"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { submitRequirementDocumentForEmployee } from "@/lib/documents/service";
import { canReadHrWorkspace } from "@/lib/permissions/roles";

export async function submitMyDocumentAction(formData: FormData) {
  const user = await requireUser();
  const requestedEmployeeId = formData.get("employeeId");
  if (typeof requestedEmployeeId !== "string" || !requestedEmployeeId) {
    throw new Error("Employee is required.");
  }

  if (!canReadHrWorkspace(user.role) && user.employeeId !== requestedEmployeeId) {
    throw new Error("You can only submit documents for your own tasks.");
  }

  const employeeId = await submitRequirementDocumentForEmployee(formData, user.id, requestedEmployeeId);
  revalidatePath("/my-requirements");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(canReadHrWorkspace(user.role) ? `/my-requirements?employeeId=${employeeId}` : "/my-requirements");
}
