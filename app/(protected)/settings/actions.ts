"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createJobRole,
  createRequirement,
  removeRoleRequirement,
  upsertRoleRequirement,
} from "@/lib/settings/service";
import { HR_WRITE_ROLES } from "@/lib/permissions/roles";
import { createAppUser, setAppUserActive, updateAppUser } from "@/lib/users/service";

export async function createJobRoleAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const roleId = await createJobRole(formData, actor.id);
  revalidatePath("/settings");
  redirect(`/settings?roleId=${roleId}`);
}

export async function createRequirementAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  await createRequirement(formData, actor.id);
  revalidatePath("/settings");
  redirect("/settings");
}

export async function upsertRoleRequirementAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const roleId = await upsertRoleRequirement(formData, actor.id);
  revalidatePath("/settings");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(`/settings?roleId=${roleId}`);
}

export async function removeRoleRequirementAction(formData: FormData) {
  const actor = await requireRole(HR_WRITE_ROLES);
  const roleId = await removeRoleRequirement(formData, actor.id);
  revalidatePath("/settings");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
  redirect(`/settings?roleId=${roleId}`);
}


export async function createAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN"]);
  await createAppUser(formData, actor.id);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function updateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN"]);
  await updateAppUser(formData, actor.id);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function deactivateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN"]);
  await setAppUserActive(formData, actor.id, false);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function reactivateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN"]);
  await setAppUserActive(formData, actor.id, true);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}
