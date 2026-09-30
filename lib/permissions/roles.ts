import type { UserRole } from "../../generated/prisma/client";

export const HR_WRITE_ROLES = ["OWNER_ADMIN", "HR_ADMIN"] as const satisfies readonly UserRole[];
export const HR_READ_ROLES = [
  "OWNER_ADMIN",
  "HR_ADMIN",
  "MANAGER",
] as const satisfies readonly UserRole[];

export function canManageEmployees(role: UserRole): boolean {
  return HR_WRITE_ROLES.includes(role as (typeof HR_WRITE_ROLES)[number]);
}

export function canReadHrWorkspace(role: UserRole): boolean {
  return HR_READ_ROLES.includes(role as (typeof HR_READ_ROLES)[number]);
}
