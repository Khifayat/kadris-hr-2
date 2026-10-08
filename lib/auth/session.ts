import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { UserRole } from "../../generated/prisma/client";
import { prisma } from "../db/prisma";
import { APP_SESSION_COOKIE, getCognitoConfig, verifyAppSession } from "./cognito";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  tutorialCompletedAt: Date | null;
};

const appUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  employeeId: true,
  tutorialCompletedAt: true,
} as const;

export async function getCurrentUser(): Promise<AppUser | null> {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true") {
    return prisma.user.findFirst({
      where: { role: "OWNER_ADMIN", active: true },
      orderBy: { createdAt: "asc" },
      select: appUserSelect,
    });
  }

  const config = getCognitoConfig();
  if (!config) {
    return null;
  }

  const session = verifyAppSession((await cookies()).get(APP_SESSION_COOKIE)?.value, config.sessionSecret);
  if (!session) return null;

  return prisma.user.findFirst({
    where: { id: session.userId, active: true },
    select: appUserSelect,
  });
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: readonly UserRole[]): Promise<AppUser> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) redirect("/unauthorized");
  return user;
}
