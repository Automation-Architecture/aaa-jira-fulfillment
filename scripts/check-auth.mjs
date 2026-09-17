import { readFileSync } from "node:fs";

const runtimeFiles = [
  "public/login.html",
  "public/auth/callback.html",
  "public/auth/clerk-client.js",
  "vercel.json",
];

const runtimeBanned = /supabase|qmdblnaqpylbnufvarcu|SUPABASE_ANON_KEY/i;
const allow = "brad@automationarchitecture.ai";

for (const file of runtimeFiles) {
  const src = readFileSync(file, "utf8");
  if (runtimeBanned.test(src)) {
    throw new Error(`${file} still references Supabase auth`);
  }
}

const mw = readFileSync("middleware.js", "utf8");
if (/supabase\.co|process\.env\.SUPABASE|createBrowserClient|sb-.*-auth-token/i.test(mw)) {
  throw new Error("middleware.js still has runtime Supabase auth");
}

if (!mw.includes(allow)) {
  throw new Error("middleware.js is missing the hard-coded brad@ allowlist");
}
if (!mw.includes("/.well-known/")) {
  throw new Error("middleware.js is missing the ACME /.well-known/ exemption");
}
if (!mw.includes("CLERK_SECRET_KEY") || !mw.includes("CLERK_PUBLISHABLE_KEY")) {
  throw new Error("middleware.js is missing Clerk env vars");
}

const wellKnownIdx = mw.indexOf("/.well-known/");
const clerkAuthIdx = mw.indexOf("authenticateRequest");
if (wellKnownIdx < 0 || clerkAuthIdx < 0 || wellKnownIdx > clerkAuthIdx) {
  throw new Error("ACME /.well-known/ exemption must run before Clerk auth");
}

const readme = readFileSync("README.md", "utf8");
if (!readme.includes("CLERK_SECRET_KEY") || !readme.includes("CLERK_PUBLISHABLE_KEY")) {
  throw new Error("README.md must document Clerk env vars");
}
if (!readme.includes("SUPABASE_ANON_KEY") || !readme.toLowerCase().includes("retired")) {
  throw new Error("README.md must drop SUPABASE_ANON_KEY as a requirement");
}

console.log("auth gate checks ok");
