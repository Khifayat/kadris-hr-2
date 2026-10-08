"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { updateOwnProfile } from "@/lib/users/service";

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireUser();
  await updateOwnProfile(formData, user.id);
  revalidatePath("/profile");
  redirect("/profile?updated=1");
}
