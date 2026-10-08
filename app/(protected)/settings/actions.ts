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
import { canManageAppUsers } from "@/lib/permissions/roles";

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
  const actor = await requireRole(["OWNER_ADMIN", "ADMIN"]);
  if (!canManageAppUsers(actor.role)) throw new Error("You do not have permission to manage app users.");
  await createAppUser(formData, actor.id, actor.role);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function updateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN", "ADMIN"]);
  if (!canManageAppUsers(actor.role)) throw new Error("You do not have permission to manage app users.");
  await updateAppUser(formData, actor.id, actor.role);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function deactivateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN", "ADMIN"]);
  if (!canManageAppUsers(actor.role)) throw new Error("You do not have permission to manage app users.");
  await setAppUserActive(formData, actor.id, actor.role, false);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}

export async function reactivateAppUserAction(formData: FormData) {
  const actor = await requireRole(["OWNER_ADMIN", "ADMIN"]);
  if (!canManageAppUsers(actor.role)) throw new Error("You do not have permission to manage app users.");
  await setAppUserActive(formData, actor.id, actor.role, true);
  revalidatePath("/settings");
  redirect("/settings#users-access");
}
