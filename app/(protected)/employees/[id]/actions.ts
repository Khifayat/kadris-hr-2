"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { approveRequirement, rejectRequirement, submitRequirementDocument } from "@/lib/documents/service";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";
import { inviteEmployeeUser } from "@/lib/users/service";

export async function inviteEmployeeUserAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const employeeId = formData.get("employeeId");
  if (typeof employeeId !== "string" || !employeeId) throw new Error("Employee is required.");
  try {
    await inviteEmployeeUser(employeeId, actor.id);
  } catch {
    redirect(`/employees/${employeeId}?access=invite_failed`);
  }
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/settings");
  redirect(`/employees/${employeeId}?access=invited`);
}

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
