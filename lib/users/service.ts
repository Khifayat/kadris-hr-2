import "server-only";

import { randomUUID } from "node:crypto";
import { inviteCognitoUser } from "../auth/cognito-admin";
import { prisma } from "../db/prisma";
import { createAppUserSchema, updateAppUserSchema } from "./schema";

function getFormId(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required.`);
  return value.trim();
}

async function assertCanModifyUser(actorId: string, targetUserId: string, nextActive?: boolean) {
  if (actorId === targetUserId && nextActive === false) {
    throw new Error("You cannot deactivate your own account.");
  }
}

async function assertOwnerAdminSafety(targetUserId: string, nextRole: string, nextActive: boolean) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true, active: true } });
  if (!target) throw new Error("User not found.");

  const demotesOrDeactivatesOwner = target.role === "OWNER_ADMIN" && (nextRole !== "OWNER_ADMIN" || !nextActive);
  if (!demotesOrDeactivatesOwner) return;

  const otherActiveOwners = await prisma.user.count({
    where: { id: { not: targetUserId }, role: "OWNER_ADMIN", active: true },
  });
  if (otherActiveOwners === 0) throw new Error("Create another active owner/admin before changing this owner account.");
}

async function validateEmployeeLink(employeeId: string | null, userId?: string) {
  if (!employeeId) return;
  const existing = await prisma.user.findFirst({
    where: { employeeId, ...(userId ? { id: { not: userId } } : {}) },
    select: { email: true },
  });
  if (existing) throw new Error(`That employee profile is already linked to ${existing.email}.`);
}

export async function createAppUser(formData: FormData, actorId: string) {
  const input = createAppUserSchema.parse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    employeeId: formData.get("employeeId"),
  });

  await validateEmployeeLink(input.employeeId);

  const user = await prisma.user.create({
    data: {
      authProviderId: `pending:${randomUUID()}`,
      email: input.email,
      name: input.name,
      role: input.role,
      employeeId: input.employeeId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, role: user.role, employeeId: user.employeeId },
    },
  });
}

export async function inviteAppUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, active: true },
  });
  if (!user || !user.active) throw new Error("An active app user is required before sending an invitation.");

  const invitation = await inviteCognitoUser({ email: user.email, name: user.name });
  const updated = invitation.sub
    ? await prisma.user.update({
        where: { id: user.id },
        data: { authProviderId: `cognito:${invitation.sub}` },
      })
    : user;

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "USER_INVITED",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, cognitoStatus: invitation.status },
    },
  });
  return updated;
}

export async function inviteEmployeeUser(employeeId: string, actorId: string) {
  const user = await prisma.user.findUnique({ where: { employeeId }, select: { id: true } });
  if (!user) throw new Error("This employee does not have a linked app user.");
  return inviteAppUser(user.id, actorId);
}

export async function updateAppUser(formData: FormData, actorId: string) {
  const input = updateAppUserSchema.parse({
    userId: formData.get("userId"),
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    employeeId: formData.get("employeeId"),
  });

  await assertCanModifyUser(actorId, input.userId);
  await assertOwnerAdminSafety(input.userId, input.role, true);
  await validateEmployeeLink(input.employeeId, input.userId);

  const user = await prisma.user.update({
    where: { id: input.userId },
    data: { email: input.email, name: input.name, role: input.role, employeeId: input.employeeId, active: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, role: user.role, employeeId: user.employeeId, active: user.active },
    },
  });
}

export async function setAppUserActive(formData: FormData, actorId: string, active: boolean) {
  const userId = getFormId(formData, "userId");
  await assertCanModifyUser(actorId, userId, active);
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new Error("User not found.");
  await assertOwnerAdminSafety(userId, target.role, active);

  const user = await prisma.user.update({ where: { id: userId }, data: { active } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, active },
    },
  });
}
