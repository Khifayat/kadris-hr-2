"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { approveRequirement, rejectRequirement, submitRequirementDocument } from "@/lib/documents/service";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";

export async function submitDocumentAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const employeeId = await submitRequirementDocument(formData, actor.id);
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(`/employees/${employeeId}`);
}

export async function approveRequirementAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const requirementId = formData.get("employeeRequirementId");
  if (typeof requirementId !== "string") throw new Error("Requirement is required.");
  const employeeId = await approveRequirement(requirementId, actor.id);
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(`/employees/${employeeId}`);
}

export async function rejectRequirementAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const employeeId = await rejectRequirement(formData, actor.id);
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(`/employees/${employeeId}`);
}
