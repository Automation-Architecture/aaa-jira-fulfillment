// Clerk session gate for an internal AAA dashboard (static single-page app).
//
// AAA-769 Phase 1: replaces shared Supabase Auth (aaa-internal-auth /
// qmdblnaqpylbnufvarcu). Access requires (1) a valid Clerk session, AND (2) the
// session email being brad@automationarchitecture.ai (hard-coded sole allowlist).
// The dashboard HTML is never returned to an unauthenticated/unauthorized
// browser — gating happens here at the edge, before public/index.html is served.
//
// Env vars (Vercel production target; values never in repo):
//   CLERK_SECRET_KEY        — Clerk secret key (sk_…); verifies the session
//   CLERK_PUBLISHABLE_KEY   — Clerk publishable key (pk_…); handshake + /auth/config
//   CLERK_JWT_KEY           — optional PEM public key for networkless JWT verify
// ALLOWED_EMAILS / SUPABASE_ANON_KEY are not read. Do not set SUPABASE_ANON_KEY.

import { createClerkClient } from "@clerk/backend";

export const config = { matcher: "/:path*" };

const ALLOWED_EMAIL = "brad@automationarchitecture.ai";

function clerkClient() {
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY || "",
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  });
}

function emailFromClaims(claims) {
  if (!claims || typeof claims !== "object") return "";
  const raw =
    claims.email ||
    claims.email_address ||
    claims.primary_email ||
    claims.primaryEmailAddress ||
    "";
  return String(raw).toLowerCase();
}

function emailFromUser(user) {
  if (!user) return "";
  const primary =
    user.primaryEmailAddress?.emailAddress ||
    user.primary_email_address?.email_address ||
    "";
  if (primary) return String(primary).toLowerCase();
  const list = user.emailAddresses || user.email_addresses || [];
  const first = list[0]?.emailAddress || list[0]?.email_address || "";
  return String(first).toLowerCase();
}

async function sessionEmail(client, auth) {
  const fromClaims = emailFromClaims(auth.sessionClaims);
  if (fromClaims) return fromClaims;
  if (!auth.userId) return "";
  try {
    const user = await client.users.getUser(auth.userId);
    return emailFromUser(user);
  } catch {
    return "";
  }
}

function isPublicPath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/login.html" ||
    pathname === "/favicon.ico" ||
    pathname === "/auth/config" ||
    pathname.startsWith("/auth/")
  );
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const { pathname } = url;

  // ACME challenges must never be gated — blocking these stops TLS cert issuance
  // for any custom domain. Keep this first.
  if (pathname.startsWith("/.well-known/")) return;

  // Publishable key for the login JS (not a secret). Never include the secret key.
  if (pathname === "/auth/config") {
    return Response.json(
      { publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "" },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const clerk = clerkClient();
  let requestState;
  try {
    const opts = {
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
      secretKey: process.env.CLERK_SECRET_KEY || "",
      authorizedParties: [url.origin],
    };
    if (process.env.CLERK_JWT_KEY) opts.jwtKey = process.env.CLERK_JWT_KEY;
    requestState = await clerk.authenticateRequest(req, opts);
  } catch {
    if (isPublicPath(pathname)) return;
    return Response.redirect(new URL("/login", req.url), 302);
  }

  // Clerk handshake (ticket / satellite cookie sync): follow Location if present.
  const handshakeLocation = requestState.headers?.get("Location");
  if (handshakeLocation) {
    return new Response(null, {
      status: 307,
      headers: requestState.headers,
    });
  }
  if (requestState.status === "handshake") {
    if (isPublicPath(pathname)) return;
    return Response.redirect(new URL("/login", req.url), 302);
  }

  // Public auth surfaces (the login flow itself must be reachable unauthenticated).
  if (isPublicPath(pathname)) return;

  if (!requestState.isAuthenticated) {
    return Response.redirect(new URL("/login", req.url), 302);
  }

  const auth = requestState.toAuth();
  if (!auth?.userId) {
    return Response.redirect(new URL("/login", req.url), 302);
  }

  try {
    const email = await sessionEmail(clerk, auth);
    if (email && email === ALLOWED_EMAIL) return; // authorized → serve
    return Response.redirect(new URL("/login?error=forbidden", req.url), 302);
  } catch {
    return Response.redirect(new URL("/login", req.url), 302);
  }
}
