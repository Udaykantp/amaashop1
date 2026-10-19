import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/admin-signin-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["SUPER_ADMIN", "OPS_ADMIN", "FINANCE_ADMIN"];

export default async function AdminSignInPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user && ADMIN_ROLES.includes(user.role)) redirect("/admin");

  return <AdminSignInForm />;
}
