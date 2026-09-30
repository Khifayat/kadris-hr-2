import "server-only";

import { prisma } from "../db/prisma";

export async function getUsersAccessData() {
  const [users, employees] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true } },
      },
    }),
    prisma.employee.findMany({
      where: { status: { not: "TERMINATED" } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        user: { select: { id: true, email: true } },
      },
    }),
  ]);

  return { users, employees };
}

export function employeeLabel(employee: { firstName: string; lastName: string; employeeNumber: string }) {
  return `${employee.firstName} ${employee.lastName} · ${employee.employeeNumber}`;
}
