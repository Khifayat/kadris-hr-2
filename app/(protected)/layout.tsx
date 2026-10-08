import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { FirstAccessTutorial } from "@/components/tutorial/first-access-tutorial";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <><AppShell user={user}>{children}</AppShell>{!user.tutorialCompletedAt && <FirstAccessTutorial role={user.role} />}</>;
}
