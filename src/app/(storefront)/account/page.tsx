import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { Collections, doc } from "@/server/firestore";
import type { AppUserDoc } from "@/server/models";
import { LoggedInView } from "@/components/account/logged-in-view";
import { LoggedOutView } from "@/components/account/logged-out-view";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return <LoggedOutView />;

  const snap = await doc(Collections.appUsers, user.uid).get();
  const createdAt = snap.exists ? (snap.data() as AppUserDoc).createdAt.toDate().toISOString() : null;

  return <LoggedInView user={{ email: user.email, displayName: user.displayName, createdAt }} />;
}
