import "server-only";

import type { Prisma } from "../../generated/prisma/client";
import { calculateEmployeeClearance } from "./clearance";

type ClearanceTx = Prisma.TransactionClient;

export async function refreshEmployeeClearance(
  tx: ClearanceTx,
  employeeId: string,
  actorId: string | null,
): Promise<void> {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: { clearanceStatus: true, clearedAt: true },
  });
  if (!employee) throw new Error("Employee not found.");

  const requirements = await tx.employeeRequirement.findMany({
    where: { employeeId, active: true },
    include: { requirement: { select: { name: true } } },
  });
  const evaluatedAt = new Date();
  const clearance = calculateEmployeeClearance(
    requirements.map((item) => ({
      id: item.id,
      name: item.requirement.name,
      status: item.status,
      active: item.active,
      requiredBeforeWork: item.requiredBeforeWork,
      conditional: item.conditional,
      conditionSatisfied: item.conditionSatisfied,
      expires: item.expires,
      expirationDate: item.expirationDate,
      reminderDays: item.reminderDays,
    })),
    evaluatedAt,
  );

  await tx.employee.update({
    where: { id: employeeId },
    data: {
      clearanceStatus: clearance.status,
      clearanceCalculatedAt: evaluatedAt,
      clearedAt: clearance.cleared ? (employee.clearedAt ?? evaluatedAt) : null,
    },
  });

  if (employee.clearanceStatus !== clearance.status) {
    await tx.clearanceEvent.create({
      data: {
        employeeId,
        fromStatus: employee.clearanceStatus,
        toStatus: clearance.status,
        reasons: clearance.reasons,
        triggeredByUserId: actorId,
      },
    });
  }
}
