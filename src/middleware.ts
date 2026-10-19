import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware. Both branches are a cheap RBAC pre-filter for the same
 * reason: the Firebase **session cookie** can't be cryptographically verified
 * on the Edge runtime (needs Node + firebase-admin), so this only checks the
 * cookie is *present* and bounces anonymous hits to sign-in. The
 * authoritative checks — session verification, role, mandatory 2FA, and the
 * Super Admin e-mail allow-list — run server-side in
 * `src/server/auth/guards.ts` (`requireAdminPage` / `requireCapabilityPage`)
 * on every admin page and Server Action. Never weaken those; this is a UX +
 * load shield only.
 *
 * The storefront itself needs no middleware pass: it's mostly public, and
 * the signed-in bits (`/account`, checkout) read the same Firebase session
 * cookie server-side via `getCurrentUser()` — no per-request token refresh
 * needed the way the old Supabase JWT session did.
 *
 * The `(member)` portal gates itself server-side; it's matched here only so
 * the MAINTENANCE_MODE gate below also covers its deep links.
 */

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "amaashop_session";

// Console / back-office routes reachable while signed out — don't loop the redirect.
const ADMIN_PUBLIC_PATHS = ["/admin/signin", "/admin/no-access", "/admin/verify"];
const OFFICE_PUBLIC_PATHS = ["/office/login", "/office/forgot"];

// Site-wide "under construction" gate, toggled by MAINTENANCE_MODE without
// touching any other code — covers the storefront, /admin, and /office
// (including direct/deep links). API routes stay reachable so webhooks keep
// working. Set MAINTENANCE_MODE=false (or unset it) and redeploy to turn it
// back off — that toggle doesn't depend on admin access, so it's safe to
// block admin too.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AmaaShop — Under Construction</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 24px; box-sizing: border-box;
    background: #fbf7f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #2f2a22;
    text-align: center;
  }
  .card { max-width: 480px; }
  h1 { font-size: 1.5rem; margin: 0 0 12px; font-weight: 600; }
  p { font-size: 1rem; line-height: 1.5; color: #6b6355; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>We're currently under construction</h1>
    <p>AmaaShop is getting a few improvements. Please check back soon.</p>
  </div>
</body>
</html>`;

function maintenanceResponse() {
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
    },
  });
}

function cheapGate(request: NextRequest, loginPath: string): NextResponse | null {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();
  const login = new URL(loginPath, request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE && !pathname.startsWith("/api")) {
    return maintenanceResponse();
  }

  if (pathname.startsWith("/admin")) {
    if (ADMIN_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    return cheapGate(request, "/admin/signin") ?? NextResponse.next();
  }

  // Distributor back-office — same edge pre-filter; the real auth (session
  // verification + "must have a member profile") runs server-side in
  // src/server/office/context.ts.
  if (pathname.startsWith("/office")) {
    if (OFFICE_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    return cheapGate(request, "/office/login") ?? NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // storefront: everything except static assets, the member portal, the
    // admin console, the back-office, the Firebase auth API, and image files …
    "/((?!_next/static|_next/image|favicon.ico|member|admin|office|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // … the member portal, admin console, and back-office are matched
    // explicitly so MAINTENANCE_MODE also catches their deep links.
    "/member/:path*",
    "/admin/:path*",
    "/office/:path*",
  ],
};
