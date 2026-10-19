/**
 * End-to-end auth smoke test against the running dev stack (db + emulator + web).
 *   node scripts/verify-auth.mjs
 */
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-amaashop";
const EMU = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const BASE = "http://localhost:3000";

async function idTokenFor(email, password) {
  const url = `http://${EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(json)}`);
  return json.idToken;
}

async function sessionCookieFor(idToken) {
  const res = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (!res.ok || !setCookie) throw new Error(`session mint failed: ${res.status} ${await res.text()}`);
  return setCookie.split(";")[0];
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

const check = (name, cond, extra = "") =>
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`);

// 1. anonymous hits redirect
const anon = await get("/admin/members");
check("anon /admin/members redirects to signin", anon.status >= 300 && anon.status < 400 && (anon.location || "").includes("/admin/signin"), `${anon.status} -> ${anon.location}`);

// 2. super admin full access
const superTok = await idTokenFor("ashokkumarmoharana05@gmail.com", "Admin@12345");
const superCookie = await sessionCookieFor(superTok);
const overview = await get("/admin", superCookie);
check("super admin GET /admin = 200", overview.status === 200, String(overview.status));
check("  and not the 'connect backend' screen", !overview.body.includes("Backend not connected"));
check("  shows the console (Needs attention / Overview)", /Needs attention|nothing needs your attention|Active commission plan/.test(overview.body));
const commission = await get("/admin/commission", superCookie);
check("super admin GET /admin/commission = 200", commission.status === 200, String(commission.status));
const users = await get("/admin/users", superCookie);
check("super admin GET /admin/users = 200", users.status === 200, String(users.status));

// 3. store manager is scoped
const storeTok = await idTokenFor("store@amaashop.local", "Store@12345");
const storeCookie = await sessionCookieFor(storeTok);
const storeCatalog = await get("/admin/catalog", storeCookie);
check("store manager GET /admin/catalog = 200", storeCatalog.status === 200, String(storeCatalog.status));
const storeCommission = await get("/admin/commission", storeCookie);
check("store manager BLOCKED from /admin/commission", storeCommission.status >= 300 && (storeCommission.location || "").includes("no-access"), `${storeCommission.status} -> ${storeCommission.location}`);

// 4. member portal has real data (no preview banner)
const memberTok = await idTokenFor("sponsor@amaashop.local", "Sponsor@12345");
const memberCookie = await sessionCookieFor(memberTok);
const dash = await get("/member", memberCookie);
check("member GET /member = 200", dash.status === 200, String(dash.status));
check("  no preview-mode banner", !dash.body.includes("Preview mode"));
const net = await get("/member/network", memberCookie);
check("member network shows seeded team", /Level 1|Your team/.test(net.body));

console.log("\ndone.");
