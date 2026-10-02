import middleware from "../middleware.js";

function req(path) {
  return new Request("https://fulfillment.example.test" + path);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const acme = await middleware(req("/.well-known/acme-challenge/abc"));
assert(acme === undefined, "ACME path must fall through (no gate)");

const config = await middleware(req("/auth/config"));
assert(config instanceof Response, "/auth/config must return JSON");
assert(config.headers.get("content-type")?.includes("application/json"), "/auth/config content-type");
const body = await config.json();
assert("publishableKey" in body, "/auth/config must expose publishableKey only");
assert(!("secretKey" in body) && !("CLERK_SECRET_KEY" in body), "/auth/config must not leak the secret key");

const login = await middleware(req("/login"));
assert(
  login === undefined || (login instanceof Response && login.status >= 300 && login.status < 400),
  "/login must stay reachable (fall through or Clerk handshake redirect)",
);

const gated = await middleware(req("/"));
assert(gated instanceof Response, "dashboard HTML must not fall through unauthenticated");
assert(gated.status === 302, `unauthenticated / must 302, got ${gated.status}`);
assert(new URL(gated.headers.get("location"), "https://fulfillment.example.test").pathname === "/login", "unauthenticated / must redirect to /login");

console.log("middleware behavior checks ok");
