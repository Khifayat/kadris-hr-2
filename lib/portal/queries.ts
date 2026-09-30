import "server-only";

import { prisma } from "../db/prisma";

export async function getEmployeePortalOptions() {
  return prisma.employee.findMany({
    where: { status: { not: "TERMINATED" } },
    select: { id: true, firstName: true, lastName: true, employeeNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getEmployeePortalProfile(employeeId: string) {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      jobRole: { select: { name: true, department: true } },
      requirements: {
        where: { active: true },
        include: {
          requirement: true,
          documents: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              fileName: true,
              sizeBytes: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: [{ requiredBeforeWork: "desc" }, { requirement: { name: "asc" } }],
      },
    },
  });
}
