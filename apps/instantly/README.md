# Instantly

Manage cold-email campaigns, leads, sending accounts and the Unibox on the **Instantly API v2**.

- **Categories** — marketing, email, crm
- **Auth methods** — api-key
- **Actions** — 38
- **Health checks** — ~~`service`~~ · ~~`rate-limit`~~ (both declared unavailable) + the derived
  `auth:api-key`
- **Egress allowlist** — `api.instantly.ai`
- **Website** — https://instantly.ai/
- **API docs** — https://developer.instantly.ai/
- **OpenAPI** — https://api.instantly.ai/openapi/api_v2.json

Instantly runs **campaigns**: scheduled email sequences sent from a pool of connected **sending
accounts**, with **lead** tracking, interest-status labeling (a lightweight CRM), and a shared inbox
(**Unibox**) for replies. This app covers the path a workflow actually needs against that surface —
create/launch/pause a campaign and read its analytics; add, search, update and move leads; manage
sending accounts and their warmup/volume analytics; and read, reply to or forward Unibox emails.

> **Everything below was verified against Instantly's own sources on 2026-08-29** — its
> machine-readable OpenAPI 3.0 document
> ([`api.instantly.ai/openapi/api_v2.json`](https://api.instantly.ai/openapi/api_v2.json),
> 4,221,761 bytes, `info.version` `2.0.0`, 184 paths), the prose pages linked from
> [`developer.instantly.ai/llms.txt`](https://developer.instantly.ai/llms.txt), and live probes
> against `api.instantly.ai`, `status.instantly.ai`, and the `*.statuspage.io` subdomains a status
> page of this kind would live at. Nothing here came from a third-party integration directory.

## The three things most likely to go wrong

### 1. Every route is scope-gated, and there is no unscoped key

Instantly's key-creation screen (Settings > Integrations > API Keys) makes the caller tick
individual per-resource scopes — `campaigns:read`, `leads:all`, `all:read`, … — and the OpenAPI
document names the scopes each route accepts right in that route's own description. There is no
"give me everything" default: a key created with only, say, `leads:all` is refused on every
Campaign or Account route.

That is why the health probe (see below) reads `GET /api/v2/campaigns?limit=1` rather than the
obvious `GET /api/v2/workspaces/current` — Instantly publishes **no scope-free "whoami" at all**,
so the probe instead reads the resource this app's own action surface is built around, and a
refusal reports the vendor's own reason (`403`, "the API key scope … does not allow this action")
rather than a bare "invalid credential".

### 2. Connecting a sending account means handing Instantly a mailbox's own IMAP/SMTP password

`account-create` is the one action in this app that carries a raw credential as a request field
rather than through the Auth `sign` hook. `imap_password`/`smtp_password` are the **mailbox's own**
IMAP/SMTP password (or app password) — data this action provisions *into* Instantly, not this
app's own Connection credential, so there is nothing for `sign` to inject it into. Both fields are
declared `type: "secret"` so the host masks and encrypts them exactly like the Connection's own API
key.

### 3. Three numeric status enums look alike and are NOT interchangeable

| Enum | Values | Trap |
| --- | --- | --- |
| **Campaign status** (`Campaign.status` / `campaign_status`) | `-99, -1, -2, 0, 1, 2, 3, 4` | `2` = Paused, `3` = Completed |
| **Account status** (`Account.status` / `listAccount`'s `status` filter) | `1, 2, 3, -1, -2, -3` | `2` = Paused, `3` = **Temporarily paused for maintenance** |
| **Lead-delete status filter** (`bulkDeleteLeads`'s `status` only — `Lead` itself carries no such code) | `1, 2, 3, -1, -2, -3` | Same six numbers as Account status, but `3` = **Completed** and `-1` = **Bounced** |

Each is kept as its own named `Option[]` in [`lib/params.ts`](lib/params.ts) rather than one shared
enum, specifically so a `2` can't silently migrate from one meaning to another.

### Smaller traps worth knowing

- **The vendor's own prose has a typo the schema doesn't.** The Reply-to-an-Email doc page spells
  the field `reyply_to_uuid`; the actual OpenAPI property — and the one the API accepts — is
  `reply_to_uuid`. Only the schema was trusted; see [`actions/email-reply.ts`](actions/email-reply.ts).
- **`moveLeads`'s destination fields are `to_campaign_id`/`to_list_id`**, not
  `destination_campaign_id` as a first read of the endpoint's summary might suggest — again, only
  the schema's actual property names were used.
- **Cursor pagination throughout, never offset.** Every list endpoint pages with `limit` (max 100)
  and an opaque `starting_after`/`next_starting_after` cursor pair — there is no `total`. Round-trip
  the cursor verbatim; `listAccount`'s in particular is a compound `timestamp_created&email` string
  per the vendor's own doc.
- **Errors are uniformly `{statusCode, error, message}`.** `error` is the HTTP reason phrase;
  `message` is what actually distinguishes "Missing authorization header" from "Invalid API key" —
  both arrive as a bare `401` otherwise. See [`lib/client.ts`](lib/client.ts)'s
  `formatInstantlyError`.
- **`campaign_schedule.sequences` only reads its first array element**, per the vendor's own schema
  note — a second sequence is silently ignored, not an error.

## Auth

One method: `api-key`, type `bearer` — `Authorization: Bearer <key>`. Instantly publishes no OAuth
surface for third-party apps, so the key is the whole authentication story, and there is no
alternate presentation (no `?api_key=` query form).

### The probe is `GET /api/v2/campaigns?limit=1`

| Candidate | Requires a credential? | Reachable by a narrowly-scoped key? | Leaks anything? |
| --- | --- | --- | --- |
| **`GET /campaigns?limit=1`** | ✅ `401 "Missing authorization header"` unauthenticated | ✅ needs only `campaigns:read`, which most integrations already have | ✅ one campaign row, no secrets |
| `GET /workspaces/current` | ✅ | ❌ needs `workspaces:read` **specifically** — a key scoped to Campaigns/Leads/Accounts is refused | ✅ |

`GET /workspaces/current` is still used, but only inside `afterConnect` (to publish the workspace
name), and its failure there is silent: `test` has already established the key is live, and a
missing display label must not fail a good Connection.

The three status codes this probe distinguishes:

| Status | Meaning | Reported as |
| --- | --- | --- |
| `401`, message "Missing authorization header" | credential never reached the request | reconnect the connection |
| `401`, message "Invalid API key" | key wrong or revoked | check it was copied correctly |
| `403` | key valid, not scoped for Campaigns | add `campaigns:read` (or `all:read`) |
| `402` | workspace has no active paid plan | a billing problem, not a credential one |

## Actions

38 actions. `resource` groups them in the editor.

### Campaigns (11)

| Key | Type | Endpoint |
| --- | --- | --- |
| `campaign-list` | search | `GET /api/v2/campaigns` |
| `campaign-create` | perform | `POST /api/v2/campaigns` |
| `campaign-get` | read | `GET /api/v2/campaigns/{id}` |
| `campaign-patch` | perform | `PATCH /api/v2/campaigns/{id}` |
| `campaign-delete` | perform | `DELETE /api/v2/campaigns/{id}` |
| `campaign-activate` | perform | `POST /api/v2/campaigns/{id}/activate` |
| `campaign-pause` | perform | `POST /api/v2/campaigns/{id}/pause` |
| `campaign-duplicate` | perform | `POST /api/v2/campaigns/{id}/duplicate` |
| `campaign-analytics-get` | read | `GET /api/v2/campaigns/analytics` |
| `campaign-analytics-overview-get` | read | `GET /api/v2/campaigns/analytics/overview` |
| `campaign-sending-status-get` | read | `GET /api/v2/campaigns/{id}/sending-status` |

`campaign-activate` covers **both** starting a draft campaign and resuming a paused one — Instantly
gives them no separate routes. `campaign_schedule` (a per-weekday schedule with a ~420-entry IANA
timezone enum) and `sequences` (the actual email copy — steps, delay, variants) are exposed as raw
`json` params rather than expanded field-by-field, the same choice `apps/apify`'s `actor-run` makes
for its Actor input: either shape would dwarf every other field in the form for something a caller
almost always assembles programmatically.

### Leads (9)

| Key | Type | Endpoint |
| --- | --- | --- |
| `lead-create` | perform | `POST /api/v2/leads` |
| `lead-get` | read | `GET /api/v2/leads/{id}` |
| `lead-patch` | perform | `PATCH /api/v2/leads/{id}` |
| `lead-delete` | perform | `DELETE /api/v2/leads/{id}` |
| `lead-list` | search | `POST /api/v2/leads/list` |
| `lead-bulk-add` | perform | `POST /api/v2/leads/add` |
| `lead-bulk-delete` | perform | `DELETE /api/v2/leads` |
| `lead-move` | perform | `POST /api/v2/leads/move` |
| `lead-update-interest-status` | perform | `POST /api/v2/leads/update-interest-status` |

`lead-list` is a `POST` — the vendor's own reasoning is that the filter shape is too complex for
query parameters — but it is declared `type: "search"` here since it has no side effects.
`lead-bulk-add` handles up to 1,000 leads per call and validates emails against blocklists and
existing leads; `lead-move` returns a `BackgroundJob` immediately (poll
`GET /api/v2/background-jobs/{id}`, not covered by this app, to know when the move finished).
`lead-update-interest-status` is the same action as dragging a lead between CRM columns in the web
app — a 10-minute de-duplication window after any status change means rapid repeated changes on one
lead will not all show up in `campaign-analytics-overview-get`, by design.

### Sending accounts (11)

| Key | Type | Endpoint |
| --- | --- | --- |
| `account-list` | search | `GET /api/v2/accounts` |
| `account-create` | perform | `POST /api/v2/accounts` |
| `account-get` | read | `GET /api/v2/accounts/{email}` |
| `account-patch` | perform | `PATCH /api/v2/accounts/{email}` |
| `account-delete` | perform | `DELETE /api/v2/accounts/{email}` |
| `account-pause` | perform | `POST /api/v2/accounts/{email}/pause` |
| `account-resume` | perform | `POST /api/v2/accounts/{email}/resume` |
| `account-pause-bulk` | perform | `POST /api/v2/accounts/pause` |
| `account-mark-fixed` | perform | `POST /api/v2/accounts/{email}/mark-fixed` |
| `account-warmup-analytics-get` | read | `POST /api/v2/accounts/warmup-analytics` |
| `account-daily-analytics-get` | read | `GET /api/v2/accounts/analytics/daily` |

Instantly addresses a sending account by **email**, not a separate ID — every action here takes
`email` as its key parameter. `account-pause-bulk` pauses up to 100 accounts in one call; an
account whose status did not change (e.g. already paused) lands in `failed_emails` rather than
erroring, which is what makes the action safe to mark idempotent. `account-warmup-analytics-get`
and `account-daily-analytics-get` are `read` actions despite using `POST`/`GET` respectively per the
vendor's own choice of verb per endpoint.

### Unibox (6)

| Key | Type | Endpoint |
| --- | --- | --- |
| `email-list` | search | `GET /api/v2/emails` |
| `email-get` | read | `GET /api/v2/emails/{id}` |
| `email-reply` | perform | `POST /api/v2/emails/reply` |
| `email-forward` | perform | `POST /api/v2/emails/forward` |
| `email-unread-count-get` | read | `GET /api/v2/emails/unread/count` |
| `email-thread-mark-read` | perform | `POST /api/v2/emails/threads/{thread_id}/mark-as-read` |

`email-list` carries its own documented rate limit — **20 requests/minute**, tighter than every
other endpoint in this app (which share the workspace-wide 100/s, 6000/min ceiling).

### Workspace (1)

| Key | Type | Endpoint |
| --- | --- | --- |
| `workspace-get` | read | `GET /api/v2/workspaces/current` |

Requires the `workspaces:read` scope specifically — see the Auth section above for why that scope
is not assumed anywhere else in this app.

### Idempotency

**Non-idempotent (8)** — each either mints a new resource with no caller-supplied idempotency key,
or drives an async job whose effect depends on the workspace's state at call time:
`campaign-create`, `campaign-duplicate`, `lead-create`, `lead-bulk-add`, `lead-move`,
`account-create`, `email-reply`, `email-forward`.

**Idempotent (15)** — each ends in the same state no matter how many times it runs with the same
input: `campaign-patch`, `campaign-delete`, `campaign-activate`, `campaign-pause`, `lead-patch`,
`lead-delete`, `lead-bulk-delete`, `lead-update-interest-status`, `account-patch`,
`account-delete`, `account-pause`, `account-resume`, `account-pause-bulk`, `account-mark-fixed`,
`email-thread-mark-read`.

## Health checks

Both declared checks are **absences**, plus the derived `auth:api-key`.

### ~~`service`~~ — no status page could be found

Checked three ways on 2026-08-29, all negative:

1. **`status.instantly.ai`** does not resolve at all (`NXDOMAIN`).
2. **`instantly.statuspage.io`** and **`instantlyai.statuspage.io`** — the subdomains a vendor of
   this size would typically claim — both 302-redirect to `statuspage.io`'s own marketing homepage
   rather than serving a claimed page's JSON.
3. **`instantly.ai`'s own homepage** links no `status` path of any kind.

`severity: "informational"`, so this declared absence can never pin the app's health verdict at
`unknown`.

### ~~`rate-limit`~~ — the ceiling is documented, but consumption is not

`developer.instantly.ai/getting-started/rate-limit` states fixed ceilings — 100 requests/second,
6,000 requests/minute, shared across the whole workspace, every API key, and both API v1 and v2 —
but names no response header that carries current consumption. A live probe on 2026-08-29 (both
unauthenticated and with a wrong bearer token) confirmed no `X-RateLimit-*`/`RateLimit-*` header on
the `401` response either. Instantly's own guidance for staying under the ceiling — batch calls,
add a wait between batches — is a client-side workaround for the absence of a live signal, not
evidence one exists. `severity: "informational"` for the same reason as `service`.

## Deliberately not covered

Instantly's API has **184 documented paths**. This app covers the campaign/lead/account/Unibox
core; left out, and why:

- **AI Sales Agents, AI Inbox Managers, AI Lead Finder Agents, AI Deliverability Agents** — a large
  (~70-operation) autonomous-agent surface layered on top of campaigns, each with its own
  activity feed, guidance rules and analytics. Out of scope for this pass; worth its own app-level
  pass rather than a partial one bolted onto this surface.
- **SuperSearch / company-list enrichment** — lead-sourcing and data-enrichment endpoints (facet
  search, AI enrichment, provider lookups, saved searches) that are a product in their own right
  inside Instantly, not campaign/lead management.
- **Lead labels, lead lists (CRUD), custom tags, block-list entries, audit log, background jobs
  (poll), API keys (CRUD), inbox-placement tests/analytics, email verification, DFY email account
  orders, domain forwarding, workspace groups/members/billing, phone numbers, webhooks** — all real
  and all documented, but secondary to the run-and-read path a workflow needs first. Several of
  these (background-job polling in particular) are natural follow-ups once this core is in use.
- **`GET /api/v2/accounts/ctd/status`, `POST /api/v2/accounts/test/vitals`,
  `POST /api/v2/accounts/move`** — status/diagnostic/admin-only account operations; `moveAccounts`
  in particular is documented as callable only with an **admin workspace** key.
- **OAuth connect flow for Google/Microsoft accounts** (`POST /api/v2/oauth/*`) — a
  browser-redirect flow for connecting a mailbox, not something a workflow step drives.
- **The MCP server** (`developer.instantly.ai/mcp/*`) — a separate integration surface entirely,
  not part of API v2.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` wraps Instantly's own 256x256 PNG mark
(`63f62e4d1df86f1bf7f133d5_cleaned_rounded.png`, fetched 2026-08-29 from
`cdn.prod.website-files.com`, the exact file `instantly.ai`'s own `<link rel="apple-touch-icon">`
points at) as a base64 data URI, the same pattern this pack already uses for `apps/gorgias`. No SVG
mark exists to convert instead: neither simple-icons nor n8n's `nodes-base` ship an Instantly icon
(checked 2026-08-29), so the fallback order named in the scouting brief was exhausted before
reaching for the vendor's own raster asset.

## Layout

```
instantly/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts             # InstantlyClient, cursor pagination, error formatting
│   └── params.ts             # shared Param fragments and the vendor's (non-interchangeable) enums
├── auth/api-key.ts           # bearer key: sign, test, afterConnect
├── actions/                  # one file per action (38)
├── health/
│   ├── service.ts            # declared unavailable — no status page found
│   └── rate-limit.ts         # declared unavailable — ceiling documented, consumption is not
├── assets/icon.svg           # vendor mark, embedded as a base64 PNG data URI
└── tests/                    # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt` — the task's file list excludes assets/
deno task test
deno task validate    # manifest + sandbox-rule audit (_tools/audit.ts)
```

`deno task validate` passes `--config ./deno.json` explicitly. Without it, `_tools/audit.ts` picks
up `_tools/deno.json` as its configuration and cannot resolve the `@w6w/runtime` import; this
reproduces identically for the sibling `apify` app unmodified, so it is a property of how the tool
is invoked, not of this app. Run it directly instead when that happens:
`cd ../../_tools && deno run --no-check -A audit.ts instantly`.
