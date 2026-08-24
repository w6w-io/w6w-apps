# Browse AI

Run Browse AI **robots** — pre-built or custom web scrapers/monitors — poll the tasks they create,
manage monitors, bulk runs and webhooks, on the **Browse AI API v2**.

- **Categories** — developer-tools, ai, monitoring
- **Auth methods** — api-key
- **Actions** — 18
- **Health checks** — 2 live (`service`, `queue`) + 1 declared absence (~~`quota`~~) + the derived
  `auth:api-key`
- **Egress allowlist** — `api.browse.ai` (the `service` check adds `browseai.statuspage.io` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.browse.ai/
- **API docs** — https://docs.browse.ai/api/
- **Status page** — https://browseai.statuspage.io/

Browse AI turns "click and extract" recordings (or one of its pre-built robots) into a scheduled
scraper. Running a robot creates a **task**; a task carries the extracted `capturedTexts` /
`capturedLists` / `capturedScreenshots`. A **monitor** re-runs a robot on a schedule and diffs the
result; a **bulk run** starts up to 50,000 tasks at once with different input parameters each.

> **Everything below was verified against Browse AI's own sources on 2026-08-24** — its
> machine-readable OpenAPI 3.1 document (embedded in the Scalar reference renderer served at
> [`docs.browse.ai/api/`](https://docs.browse.ai/api/), 315,197 bytes of HTML, `info.version`
> `"v2"`) and live probes against `api.browse.ai` and `browseai.statuspage.io`. Nothing here came
> from a third-party integration directory.

## The findings that would have cost someone a day

### 1. Missing and invalid credentials answer identically

Unlike Apify's `token-not-provided` vs `user-or-token-not-found`, Browse AI's own
`UnauthorizedResponse` schema declares only two `messageCode` values. Four live probes on
2026-08-24 — no `Authorization` header at all, an empty `Bearer `, a syntactically plausible fake
key, and a `Basic` scheme — all answered the **exact same** 47-byte body:

```json
{"statusCode":401,"messageCode":"unauthorized"}
```

There is no way for `auth/api-key.ts`'s `test` hook to tell a caller "your key never reached the
request" apart from "your key is wrong or revoked" — the message says so rather than guessing. The
one code worth calling out on its own is `no_api_access`: the vendor's schema documents it for a
team whose **plan** does not include API access — a remediation (upgrade the plan) that re-copying
the key cannot fix, and `test` reports it as such.

### 2. Two response envelope shapes, not one

Every response is JSON with `{statusCode, messageCode, ...}`, but the **payload key differs by
endpoint family** — read off each operation's response schema, not guessable from the verb or path:

| Shape | Endpoints |
| --- | --- |
| `{statusCode, messageCode, <resource>: …}` | Robots, monitors, webhooks, cookies — the payload sits directly under `robot`/`robots`/`monitor`/`monitors`/`webhook`/`webhooks`/`cookies` |
| `{statusCode, messageCode, result: …}` | Tasks and bulk runs — the **same** payload, wrapped one level deeper under a generic `result` key |

`lib/client.ts`'s `BrowseAiClient.request()` returns the parsed body untouched; each action reads
the specific key its own endpoint uses. Getting this wrong is the single most common way an
integration against this API silently returns `undefined`.

### 3. The documented "system status" endpoint still requires a credential — and is the auth probe

`GET /v2/status` is tagged `system` and describes Browse AI's own task-queue infrastructure, not
the caller's account — the kind of endpoint most vendors leave public. Browse AI does not: probed
live and unauthenticated, it answers the same `401 unauthorized` as every resource endpoint. That
combination — needs a credential, returns zero business data (`{tasksQueueStatus: "OK" |
"UNDER_MAINTENANCE"}` only) — is exactly what a health/auth probe wants, and is why `auth/api-key.ts`
uses it instead of the tempting `GET /v2/robots` (works too, but returns real robot names and ids —
more than a liveness probe needs to read or store).

### 4. `GET /robots/{id}/tasks` caps page size at 10, the tightest ceiling in this pack

Every other list endpoint in this API (robots, bulk runs) is either un-paginated or defaults its
page size sensibly, but `pageSize` on Get Tasks is capped at **10** with no way to ask for more.
Paging through a robot with thousands of tasks means a lot of round trips; `fromDate`/`toDate`
(Unix-millisecond bounds) are the more efficient filter for a recent window.

### 5. No readable quota anywhere — only a refusal at the moment credits run out

Live 401 responses carry no `X-RateLimit-*`/`RateLimit-*` header of any kind, and the OpenAPI
document names exactly one metered thing: task-run **credits**, surfaced only as a
`403 credits_limit_reached` refusal on `task-run`/`bulk-run-create`. There is no `/usage` or
`/credits` endpoint to read a balance from in advance — see `health/quota.ts`.

## Auth

One method: `api-key`, type `bearer`. Generated at `dashboard.browse.ai/api`; the key is a property
of a **team**, not an individual robot, and reaches every robot the team owns. Browse AI publishes
no OAuth surface for third-party apps and no query-parameter auth form — the header is the whole
story.

### The probe is `GET /v2/status`

| Candidate | Requires a credential? | Leaks anything? |
| --- | --- | --- |
| **`/v2/status`** | ✅ `401 unauthorized` unauthenticated (verified live) | ✅ nothing but the task-queue's own OK/UNDER_MAINTENANCE state |
| `/v2/robots` | ✅ | real robot names/ids — more than a liveness probe needs |
| `/v2/teams` | tagged `internal`, documented as Auth0-token-only — not reachable with the API key at all | n/a |

## Actions

18 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `robot-list` | search | `GET /v2/robots` |
| `robot-get` | read | `GET /v2/robots/{robotId}` |
| `robot-cookies-set` | perform | `PATCH /v2/robots/{robotId}/cookies` |
| `task-list` | search | `GET /v2/robots/{robotId}/tasks` |
| `task-run` | perform | `POST /v2/robots/{robotId}/tasks` |
| `task-get` | read | `GET /v2/robots/{robotId}/tasks/{taskId}` |
| `monitor-list` | search | `GET /v2/robots/{robotId}/monitors` |
| `monitor-create` | perform | `POST /v2/robots/{robotId}/monitors` |
| `monitor-get` | read | `GET /v2/robots/{robotId}/monitors/{monitorId}` |
| `monitor-update` | perform | `PATCH /v2/robots/{robotId}/monitors/{monitorId}` |
| `monitor-delete` | perform | `DELETE /v2/robots/{robotId}/monitors/{monitorId}` |
| `bulk-run-create` | perform | `POST /v2/robots/{robotId}/bulk-runs` |
| `bulk-run-list` | search | `GET /v2/robots/{robotId}/bulk-runs` |
| `bulk-run-get` | read | `GET /v2/robots/{robotId}/bulk-runs/{bulkRunId}` |
| `webhook-list` | search | `GET /v2/robots/{robotId}/webhooks` |
| `webhook-create` | perform | `POST /v2/robots/{robotId}/webhooks` |
| `webhook-delete` | perform | `DELETE /v2/robots/{robotId}/webhooks/{webhookId}` |
| `status-get` | read | `GET /v2/status` |

### Idempotency

**None of Browse AI's write endpoints document an idempotency key** — unlike Apify, which offers
one on Create Webhook, nothing here does. `task-run`, `monitor-create`, `bulk-run-create` and
`webhook-create` are all `idempotent: false`: each call starts new work (a task, a monitor, a batch
of tasks, a webhook registration that will fire twice if duplicated) and the runtime must not retry
them on its own.

`robot-cookies-set` (a `PATCH` that **fully replaces** the cookie set, not merges), `monitor-update`
(a partial `PATCH` by id — the same body always lands on the same resulting monitor) and
`monitor-delete`/`webhook-delete` (already-gone stays gone; a repeat answers `404`, never a second
success) are `idempotent: true`.

### Notes on individual actions

- **`robot-get`'s `inputParameters` is worth reading before `task-run`.** It lists exactly which
  override keys a robot accepts — its origin-URL field, any limit/skip pair, select-style filters —
  each with its own `name`/`type`/`defaultValue`. `task-run`'s `inputParameters` has to match that
  shape to have any effect.
- **`monitor-create`/`monitor-update` send `schedule` (an iCalendar RRULE string), never the
  deprecated `schedules` array.** The OpenAPI document still lists `schedules`
  (`[{type: "FIXED_INTERVAL", everyMinutes}]`) but marks it `deprecated: true` — this app only ever
  sends the field the vendor is migrating callers to.
- **`bulk-run-get`'s `page` paginates the tasks *inside* the bulk run**, not the list of bulk runs —
  the same param name as `bulk-run-list` means a different thing depending which action it's on.
- **`task-get`'s `capturedScreenshots` carries signed, short-lived S3 URLs**, not the images
  themselves. Fetch them promptly if a later step needs the bytes.
- **`403 schedule_interval_below_minimum`** (monitor create/update) means the requested schedule
  runs more often than the team's plan allows — surfaced with that exact code via
  `formatBrowseAiError`, not a bare 403.
- **`403 exceeded_bulk_run_threshold`** (bulk-run-create) is distinct from `credits_limit_reached`:
  the input array itself is too large for the plan, separate from running out of credits.

## Health checks

Two live checks, one declared absence, plus the derived `auth:api-key`.

### `service` — `browseai.statuspage.io`, checked three ways

`status.browse.ai` itself **does not resolve** (DNS NXDOMAIN, checked live) — the vendor never put
a status page on its own apex, which is the wrong first guess. The real page:

| Path | Status | Bytes |
| --- | --- | --- |
| `/api/v2/summary.json` | 200 | 1,829 |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** |

— refuses a nonsense sibling path outright, and `page.name` is `"Browse AI System Status"` with five
components: `Public API`, `Robots' Task Execution`, `Integrations`, `Dashboard`, `Marketing Site`.
Only the first two are this app's own network surface; all five are reported, but the page-level
`status.indicator` (Browse AI's own roll-up) decides the verdict rather than the worst component, so
a `Dashboard` blip does not report the API as down.

### `queue` — `GET /v2/status`, signed, a second and different signal from `service`

Reads `{tasksQueueStatus: "OK" | "UNDER_MAINTENANCE"}`. Deliberately separate from `service`:
`browseai.statuspage.io` is a human-maintained incident page, while this is the queue reporting on
itself in real time — the two can and do disagree in either direction. `kind: "dependency"`,
`credential: "signed"`, `scope: "connection"`, since `/v2/status` refuses an unsigned request.

### ~~`quota`~~ — a declared absence, at `informational` severity

No `X-RateLimit-*`/`RateLimit-*` header on any response, and no `/usage` or `/credits` endpoint —
the only metered signal is a `403 credits_limit_reached` refusal from `task-run`/`bulk-run-create`,
delivered at the moment credits run out. `severity: "informational"` is load-bearing: an
`unavailable` entry always reports `unknown`, which outranks `ok` in the roll-up, so at any other
severity this would pin the app's verdict at `unknown` forever.

## Deliberately not covered

- **`GET /v2/teams`** — tagged `internal` in the OpenAPI document and documented as authenticated
  with an **Auth0 access token**, for Browse AI's own integrations — not the Bearer API key every
  other endpoint takes. Not exposed as an Action: it is not reachable with the credential this app's
  Auth method collects, and nothing confirms it would even accept one.
- **The deprecated `schedules` array** on monitors — superseded by `schedule` (RRULE), which this
  app sends exclusively. See "Notes on individual actions."
- **Table-export webhooks** (`tableExportFinishedSuccessfully`) — the *event type* is exposed on
  `webhook-create` (it is a real, documented value of `CreateNewWebhookBodyParams.eventType`), but
  the table-export **feature itself** (starting/reading an export) has no documented REST endpoint
  in this OpenAPI document — only its webhook payload shape is described. Registering the webhook is
  therefore covered; triggering an export is not, because there is nothing to call.
- **The deprecated v1 API** — the v2 document's own description links to it and calls it out as
  superseded; this app targets v2 exclusively.

## Icon

`assets/icon.png` is Browse AI's own mark, downloaded **verbatim** from the site's own
apple-touch-icon (`cdn.prod.website-files.com/.../68b9c656f48bca83e2a16839_webclip.png`, linked from
`https://www.browse.ai/`) on 2026-08-24 — 19,771 bytes, 256×256 PNG, md5
`ce010370e7d83e80ffdebe6b4a497417`. No true SVG mark is published (the site's own `favicon.svg`/
`favicon.ico` paths both 404); the site's `<link rel="shortcut icon">` is a 32×32 PNG version of the
same mark, so the larger apple-touch-icon was used instead, per this pack's existing PNG-icon
precedent (e.g. `apps/amplitude`, `apps/kit`). A test asserts the exact byte length, PNG signature
and pixel dimensions, so a re-encode or redraw fails the suite.

## Layout

```
browseai/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # BrowseAiClient, the two envelope shapes, error formatting
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-key.ts              # bearer token: sign, test
├── actions/                     # one file per action (18)
├── health/
│   ├── service.ts                # browseai.statuspage.io
│   ├── queue.ts                   # GET /v2/status, signed
│   └── quota.ts                   # declared absence, informational
├── assets/icon.png               # vendor mark, verbatim
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check       # typecheck
deno task lint
deno task fmt         # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
