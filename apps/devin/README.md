# Devin

Start Devin coding sessions, follow their progress, message them, and manage the attachments and
secrets that feed them — on Cognition's **Devin API v3**.

- **Categories** — developer-tools, ai
- **Auth methods** — api-key (Service User API Key or Personal Access Token, both `cog_`-prefixed,
  plus the `org-`-prefixed organization id the key operates in)
- **Actions** — 12
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.devin.ai` (the `service` check adds `www.devinstatus.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://devin.ai/
- **API docs** — https://docs.devin.ai/api-reference/overview
- **Status page** — https://www.devinstatus.com/ (`status.devin.ai` redirects here)

> **Everything below was verified on 2026-09-05** against Cognition's own `docs.devin.ai` pages
> (Mintlify-hosted; each API reference page embeds its OpenAPI schema directly in its own React
> payload rather than publishing one machine-readable document at a stable URL — every path, verb,
> query parameter and body field here was read out of that embedded schema) plus live,
> unauthenticated probes against `api.devin.ai`. Nothing here came from a third-party integration
> directory.

## Three findings worth recording

### 1. v1 — the API this task's own starting points pointed at — is the one Devin's docs call deprecated

The intake's confirmed starting point was `GET /v1/sessions` on `api.devin.ai`, and it *is* real and
reachable (an unauthenticated probe returns a genuine `401 {"detail":"Unauthorized"}`, not a 404).
But `docs.devin.ai/api-reference/authentication` states outright:

> Legacy API keys are deprecated. Use API v3 with service user authentication.

and the v3 overview adds that "the legacy APIs (v1 and v2) will be deprecated in the future" (with at
least 30 days notice), while v3 is "coming out of beta" and "the primary API for all Devin
functionality." Reachability and currency are different questions — this app is built entirely
against **v3**, not the smaller, older surface a shallower check would have landed on.

### 2. v3 is a much bigger surface than "session-oriented" suggests, and this app deliberately uses a fraction of it

v3 is genuinely an enterprise-admin platform API: automations, playbooks, knowledge notes, code
scans, audit logs, org/member/role management, IdP groups, usage metrics, billing consumption, IP
allowlists. All of it lives under the same `/v3/organizations/{org_id}/...` prefix as the session
endpoints this app uses. Nothing in that admin surface is exposed here — it belongs to an operator
console, not a workflow step — so the 12 actions below are a deliberate subset of a much larger API,
not the whole of it.

Also left out of even the smaller session surface, for the same reason: `create_as_user_id` /
`message_as_user_id` (impersonating another org member — needs the separate
`ImpersonateOrgSessions` permission), inline `session_secrets` (ephemeral secrets passed straight in
a session's create body — `secretIds`, referencing a secret created once via `secret-create`, keeps
a value out of every workflow run's params instead), and `structured_output_schema` (a JSON-Schema
contract for a session's final answer).

### 3. The organization id is a required, non-secret credential field — and every v3 endpoint needs it

There is no account-wide "give me my sessions" endpoint: every session/message/attachment/secret
path is `/v3/organizations/{org_id}/...`. A service user is provisioned into a specific organization
(or several, for an enterprise service user), so — exactly like Freshdesk's account subdomain — the
org id identifies the account and belongs to the Connection, not to each Action's params. It is
collected as a plain `string` field at connect time, and `auth/api-key.ts`'s `afterConnect` echoes it
onto the connection's display data, which `lib/client.ts` reads back from on every call. `test` also
cross-checks a service user's own reported `org_id` (from `GET /v3/self`) against what the user
typed, catching the single most likely setup mistake before any session action ever runs.

## What isn't here, and why

- **Downloading an attachment's bytes.** `session-attachment-list` returns each attachment's `url`,
  which Devin's own download endpoint 307-redirects to a presigned, time-limited storage URL. That
  redirect target is vendor-controlled and cannot be enumerated in advance, so it cannot be declared
  in `w6w.network.allow` the way every other host this app calls can. A workflow that needs the
  bytes should hand this `url` to an HTTP action built for an arbitrary caller-supplied URL.
- **Every enterprise-admin surface** listed under finding 2 above.

## Health checks

- **`service`** (`kind: service`, unsigned) — reads `www.devinstatus.com`'s real Atlassian
  Statuspage feed (confirmed real: a claimed page named "Devin," and a nonsense sibling path
  answers 404 rather than the same 200 every real path gets), but tracks **only** the two
  `Cloud Agent` components (the session-execution backend this app's entire surface depends on) —
  not the eight other components covering the web app, desktop client, and IDE integrations this
  app never touches.
- **`quota`** — declared `unavailable` at `severity: informational`. Devin exposes no request-rate
  headroom on the wire (measured: 401/403 responses carry no `X-RateLimit-*` header of any kind),
  and the one endpoint that *does* expose ACU (compute) consumption requires the
  `ViewOrgConsumption`/`ViewAccountConsumption` permission and is Enterprise-plan-only — probing it
  would report a correctly-scoped, healthy session-management credential as broken.
- **`auth:api-key`** (derived) — `GET /v3/self`, chosen because its `ReadAccountMeta` permission is
  granted to every service user by default, unlike every session/secret/attachment endpoint.

## Actions (12)

**Sessions** — `session-create`, `session-get`, `session-list`, `session-archive`,
`session-terminate`
**Messages** — `session-message-send`, `session-message-list`
**Attachments** — `session-attachment-list`, `attachment-upload`
**Secrets** — `secret-create`, `secret-list`, `secret-delete`

This is a small, honest count for a small, honest API: Devin's own docs describe the session surface
as intentionally minimal, and padding it with invented actions would misrepresent what the vendor
actually offers.
