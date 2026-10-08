"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function completeFirstAccessTutorialAction() {
  const user = await requireUser();
  if (user.tutorialCompletedAt) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { tutorialCompletedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "FIRST_ACCESS_TUTORIAL_COMPLETED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);
  revalidatePath("/", "layout");
}

export async function restartFirstAccessTutorialAction() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { tutorialCompletedAt: null } });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
