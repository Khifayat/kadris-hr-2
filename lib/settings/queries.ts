import "server-only";

import { prisma } from "../db/prisma";

export async function getSettingsData(selectedRoleId?: string) {
  const [roles, requirements] = await Promise.all([
    prisma.jobRole.findMany({
      include: {
        _count: { select: { employees: true } },
        requirements: {
          where: { active: true },
          include: { requirement: true },
          orderBy: { requirement: { name: "asc" } },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.requirement.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { jobRoles: true, employeeAssignments: true } } },
    }),
  ]);

  return {
    roles,
    requirements,
    selectedRole: roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null,
  };
}
