# aaa-jira-fulfillment

Internal Jira fulfillment dashboard (static Vercel site).

## Auth (Clerk — AAA-769 Phase 1)

The live dashboard is gated at the **Vercel edge** (`middleware.js`). HTML under
`public/` is never served to an unauthenticated or unauthorized browser.

Allowlist is **hard-coded** to `brad@automationarchitecture.ai` only. Other
emails are not admitted (including any leftover `ALLOWED_EMAILS` value).

Sign-in is Clerk (email / whatever factors the Clerk instance enables). The
login page loads Clerk JS from the instance Frontend API; the publishable key
is served from `GET /auth/config` (edge), not committed.

`/.well-known/` is exempt **first** so ACME / TLS issuance for custom domains
is not blocked.

### Vercel env vars

Set on the Vercel project (production target). Values never go in the repo.
Use `aaa-set-env vercel <NAME> <value>` — do not pipe into `vercel env add`
(non-TTY stores an empty value and exits 0). Redeploy after changing env.

| Variable | Required | Purpose |
|---|---|---|
| `CLERK_SECRET_KEY` | **yes** | Secret key (`sk_…`). Verifies the session in middleware. |
| `CLERK_PUBLISHABLE_KEY` | **yes** | Publishable key (`pk_…`). Handshake + `/auth/config` for login JS. |
| `CLERK_JWT_KEY` | no | PEM public key for networkless JWT verify (optional). |

**Retired — do not set:** `SUPABASE_ANON_KEY`. Auth no longer uses the shared
`aaa-internal-auth` Supabase project (`qmdblnaqpylbnufvarcu`). `ALLOWED_EMAILS`
is also unused; the allowlist is code, not env.

After merge: add this site’s production (and preview, if used) origins to the
Clerk instance allowed redirect / authorized-party list, then smoke as Brad.
Do not pause the Supabase Micro until that smoke passes.
