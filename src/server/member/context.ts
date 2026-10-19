import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { log } from "@/server/log";
import { backendStatus } from "@/server/member/overview";

export interface MemberContext {
  memberProfileId: string;
  displayName: string | null;
  /** true when running without the new backend — pages render placeholder data. */
  preview: boolean;
  missing: string[];
}

/**
 * Resolve the signed-in member for a `(member)` page.
 *  - backend not configured (dev)        -> preview context, no redirect
 *  - configured, not signed in           -> /signin
 *  - configured, signed in, not a member -> /member/join
 */
export async function getMemberContext(): Promise<MemberContext> {
  const status = backendStatus();
  if (!status.configured) {
    return { memberProfileId: "preview", displayName: "Preview Member", preview: true, missing: status.missing };
  }

  try {
    const user = await getCurrentUser();
    if (!user) redirect("/signin?next=/member");
    if (!user.memberProfileId) redirect("/member/join");
    return {
      memberProfileId: user.memberProfileId,
      displayName: user.displayName,
      preview: false,
      missing: [],
    };
  } catch (err) {
    // redirect() throws a control-flow signal — let it through
    if (err && typeof err === "object" && "digest" in err) throw err;
    log.warn("member context fell back to preview", { err: String(err) });
    return { memberProfileId: "preview", displayName: "Preview Member", preview: true, missing: status.missing };
  }
}
