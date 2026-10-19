"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/server/auth/session";

export async function signOutAndReturn() {
  await clearSession();
  redirect("/admin/signin");
}
