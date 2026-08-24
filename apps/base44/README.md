# Base44

Read Base44 workspace analytics, users, apps, and Superagents, and stream
Enterprise audit log events and app security-scan findings.

- **Categories** — developer-tools, ai, analytics
- **Auth methods** — api-key
- **Actions** — 11
- **Egress allowlist** — `app.base44.com`
- **Website** — https://base44.com
- **API docs** — https://docs.base44.com/developers/references/enterprise-apis
  · OpenAPI specs:
  `docs.base44.com/developers/references/monitoring-api/monitoring-openapi.json`,
  `docs.base44.com/developers/references/audit-logs-api/audit-logs-openapi.json`

Every path, parameter, and response field this app uses was verified against
those two OpenAPI 3.1 documents (58,721 and 19,277 bytes respectively) plus
their surrounding prose pages, fetched 2026-08-24.

## Why this app covers the Enterprise APIs and nothing else

Base44's headline developer surface — the thing `docs.base44.com/developers`
leads with — is a proprietary JavaScript/TypeScript SDK (`@base44/sdk`), not a
documented plain-HTTP contract. `createClient({ appId })` defaults to a fixed
host (`https://base44.app`), but the wire protocol its `entities`, `auth`, and
`functions` modules speak is never published as REST paths, request bodies,
or response shapes — only as SDK method calls (`base44.entities.Task.list()`,
`base44.auth.loginViaEmailPassword()`, …). Building actions against that would
mean guessing at an undocumented internal protocol, which this pack's own
build rules ("if a detail can't be confirmed, leave it out") explicitly rule
out.

Two more paths were checked and rejected for related reasons:

- **Backend functions** get an HTTP endpoint at
  `https://<your-app-domain>/functions/<function-name>` — but that domain is a
  **different subdomain per Base44 app** (the docs' own example:
  `your-app.base44.app`), not a fixed apex this app's `network.allow` can
  enumerate. That fails the fixed-hostname feasibility gate outright, before
  even reaching the "is it documented" question.
- **Entity CRUD** (the thing most people mean by "the Base44 API") needs
  either a logged-in end user (`loginViaEmailPassword()`, a flow with no
  documented token endpoint outside the SDK) or `asServiceRole`, which the SDK
  docs state explicitly is "only available in Base44-hosted backend
  functions" — i.e. **never reachable from an external caller at all**, this
  app included.

What Base44 *does* document end to end — fixed host, OpenAPI-declared paths,
a stable `api_key` header, workspace-scoped resources addressed by a
`workspace_id` **path segment** (the same "dynamic path under a fixed host"
shape this pack already uses for Airtable's `baseId` or dbt Cloud's
`accountId`) — is the pair of **Enterprise workspace management APIs**: the
**Monitoring API** and the **Audit Logs API**. Base44's own docs bundle these
two under one "Enterprise APIs" page, which is why this one app, one client,
and one credential cover both.

**These are Enterprise-plan-gated.** A workspace below that plan has no
functioning endpoint for this app to call at all — that is a real limitation
of the vendor's product, not a gap in this app.

## Setup

1. **Get a Base44 API key:**
   - **Personal key** — profile icon (top right) → Settings → Account →
     API Key. Works with the Monitoring API only.
   - **Workspace key** (recommended) — workspace name (bottom left) →
     Settings → Secrets → **Create API Key**. Give it **Read monitoring
     data** to use the Monitoring actions, and/or **Read audit logs**
     (`audit_logs:read`) to use `list-audit-logs` and
     `get-security-scan-findings`.
2. **Get your workspace id** — workspace name → Settings → Account. It's the
   id in the URL: `app.base44.com/workspace/<workspace_id>/settings/account`.
   Base44 documents no endpoint that lists the workspaces a key can reach, so
   — unlike this pack's dbt Cloud app, which discovers its account id from the
   API — this has to be entered by hand.
3. Connect this app with both values.

### The key-scope trap

The Monitoring API accepts a personal key or a workspace key scoped to "Read
monitoring data". The **Audit Logs API accepts only a workspace key**, and
only one carrying `audit_logs:read` — a personal key is rejected outright
regardless of the user's role. A single valid credential can therefore
legitimately fail *half* of this app's actions while the other half works
fine. The connection test (`auth/api-key.ts`) accounts for this: it tries the
Monitoring API first, falls back to the Audit Logs API, and only reports the
credential itself as bad when **both** reject it — so a workspace key scoped
only to `audit_logs:read` still connects successfully, with a message noting
which surface it verified.

## Actions

**Monitoring API** (`workspace_id` path segment; most accept an optional
`from`/`to` date range defaulting to the current billing period):

- `get-analytics` — workspace summary KPIs, user/app distribution, the shared
  credit pool, per-member credit-limit aggregates, credits consumed.
- `list-users` / `get-user` — workspace members with credit consumption.
- `list-user-apps` / `list-user-superagents` — the app/Superagent ids one
  member owns (ids only — feed into `get-app-analytics` /
  `get-superagent-analytics`).
- `list-apps` — workspace-wide app inventory with owner, visibility, publish
  state, and credit usage (avoids the fan-out `list-user-apps` would need
  across every member).
- `get-app-analytics` — detailed per-app metrics. `avgSessionDurationSec` is
  documented by the vendor as always `0` (session tracking not implemented
  for that field) and is surfaced verbatim rather than hidden.
- `list-superagents` / `get-superagent-analytics` — the same two shapes for
  Superagents.

**Audit Logs API:**

- `list-audit-logs` — paginated audit events, filterable by event type, app,
  user email, status, and date range. The full event-type catalogue (auth,
  entity CRUD, app lifecycle, workspace admin, security scans, …) is at
  `docs.base44.com/developers/references/audit-logs-api/get-started/event-types`.
- `get-security-scan-findings` — findings and per-section coverage for one
  security-scan run, addressed by the `run_id` an `app.security.check_run`
  audit event carries. **A section's findings array only means "clean" when
  its `coverage` entry reads `completed`** — `failed`/`not_run`/`unknown`
  mean the section didn't run at all, and this app surfaces `coverage`
  alongside the findings rather than collapsing that distinction away.

No `perform` actions: everything the Monitoring and Audit Logs APIs expose is
a read.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `auth:api-key` | credential (derived) | The connection test above. |
| `service` | service — **declared absent**, informational | See below. |
| `api` | dependency | `GET /api/v1/monitoring/health` — unauthenticated, proves the Monitoring API surface itself is reachable. |

**No usable vendor status page.** Two candidates were checked live on
2026-08-24: `base44.statuspage.io/api/v2/summary.json` answers `200` with
127,696 bytes of HTML titled "Real-Time Incident Communication with
Statuspage | Atlassian" — the documented signature of an **unclaimed**
Statuspage subdomain, not a real one (compare this pack's `apps/apify`, whose
real `status.apify.com` answers a few KB of JSON). And `status.base44.com`
answers `403` with a Cloudflare "Just a moment…" bot challenge to any
non-browser client, regardless of path — nothing here can read whatever real
page might live behind it. `service` is declared `unavailable` with
`severity: "informational"` rather than left as a silent gap.

**No documented quota signal.** Neither API's rate-limit page documents a
response header carrying a remaining-request count or reset time — only a
flat req/min ceiling per endpoint and a bare `429` once it's hit. There is no
`quota` check for the same reason `apitemplateio` has none: nothing to read.

## Icon

Base44 publishes no standalone vector mark — the only inline `<svg>` on
`base44.com` is the full "Base44" wordmark (letterforms, not an icon glyph).
`assets/icon.png` is the vendor's own 192×192 branded favicon
(`media.base44.com/images/public/marketing-site-assets/branded/favicon-branded-v2.png`,
byte-identical to `base44.com/favicon.ico`), used per this pack's PNG
fallback precedent (e.g. `apps/bluesky`) rather than inventing a vector.
