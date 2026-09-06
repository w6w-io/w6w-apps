# Jibble

Track time, manage people, and run attendance reports against the **Jibble** time-tracking API.

- **Categories** — productivity, hr
- **Auth methods** — client-credentials (OAuth2 `client_credentials`)
- **Actions** — 25
- **Health checks** — 2 declared absences (~~`service`~~, ~~`quota`~~) + the derived
  `auth:client-credentials`
- **Egress allowlist** — `identity.prod.jibble.io`, `workspace.prod.jibble.io`,
  `time-tracking.prod.jibble.io`, `time-attendance.prod.jibble.io`
- **Website** — https://www.jibble.io/
- **API docs** — https://docs.api.jibble.io (a Postman-documenter page)

> **Everything below was verified on 2026-09-06** against Jibble's own public Postman collection
> (`docs.api.jibble.io`, collection id `11516962-9900ee92-5a41-4f67-9bfa-005dcc0c3d7b`), fetched as
> raw JSON via the documenter's own API rather than scraped from rendered HTML. No detail here came
> from a third-party integration directory.

## The three things most likely to cost you a day

### 1. There is no `api.jibble.io` — five hosts, one credential

Jibble's API is a set of microservices, each on its own subdomain: `identity.prod.jibble.io` (token
only), `workspace.prod.jibble.io` (org, people, locations, activities, projects, clients, groups),
`time-tracking.prod.jibble.io` (time entries, time off, leave balances), and
`time-attendance.prod.jibble.io` (timesheets, reports). A single `client_credentials` token
authenticates against all of them — Jibble issues one scope for the whole API, `api1` — so there is
no per-host or per-endpoint credential to juggle, just four hostnames to route to correctly.

### 2. Pagination has no next-page link — you drive `$skip`/`$top` yourself

Every list endpoint answers OData v1's `{"@odata.context", "@odata.count", "value": [...]}`, and
reads `$select`/`$filter`/`$expand`/`$orderby`/`$top`/`$skip`/`$count`. There is **no**
`@odata.nextLink` anywhere in the collection. Page forward by tracking `$skip` yourself and stopping
once `value.length` is smaller than the requested `$top`, or once `$count`'s total is reached.
Assuming a follow-up link exists silently truncates a report at whatever page size you asked for.

### 3. "Delete Time Entry" doesn't delete anything — and id-addressing is inconsistent

The collection's own "Delete Time Entry" request is `PATCH /v1/TimeEntries/{id}` with body
`{"status": "Archived"}` — a soft delete via status flip, not an HTTP `DELETE`. This app names that
action `time-entry-archive` rather than repeating the vendor's misleading label. Contrast
`member-delete`, which really is `DELETE /v1/People(id)`.

Relatedly: most singular reads/writes address a resource OData-style, `Resource(id)` — unquoted even
though the id is a GUID (`People(558b5111-...)`, `Locations(id)`, `TimeOffIntervals(id)`) — but
`TimeEntries` uses a plain `/TimeEntries/{id}` path segment instead. Building every id-addressed URL
through the same helper would silently 404 on `TimeEntries`.

### Also worth knowing

- **`expires_in` in the vendor's own token-response example is `2147483647`** (`Int32.MaxValue`, a
  ~68-year lifetime) — treat it as a sentinel for "does not meaningfully expire," not a typical
  short-lived OAuth token. `refresh` still re-mints on request since client id/secret never expire
  either.
- **`Clients` is plan-gated.** The collection's own "Add New Client" example documents a live `402
  feature_restricted_subscription` response on a plan without that entity enabled — a 402 from
  `client-list` means the plan, not the credential, is the problem.
- **`TrackedTimeReport` documents two casings of the same filter param** (`personids` and
  `personIds`) as if they were two different parameters. This app sends only `personIds` — the form
  every other endpoint in the API uses — and does not expose `personids`.
- **`clientType` has no documented enum.** Every example in the collection uses `"Web"`; this app
  sends that literal on `time-entry-clock-in`/`time-entry-clock-out` rather than inventing a more
  descriptive value like `"Api"` that has never been confirmed to work.
- **Jibble supports async bulk export** (`Prefer: respond-async` on a supported `GET` collection
  endpoint, returning a pollable `exportId`/`statusUrl`, documented in the collection's own intro).
  Not implemented here — every list action in this app makes a plain synchronous request.

## Setup

1. In Jibble, go to **Settings → Developer → API Access** and create a Client ID / Client Secret.
2. Connect using the **API Client (Client ID / Secret)** auth method with those two values.
3. The connection tests itself against `GET /v1/Organizations` and reports the organization name.

## Actions

| Action | Type | What it does |
|---|---|---|
| `organization-get` | read | Get the connected organization |
| `member-list` | search | List members (OData query params) |
| `member-get` | read | Get one member by id |
| `member-create` | perform | Create/invite a member |
| `member-update` | perform | Edit a member's profile fields |
| `member-archive` | perform | Remove a member from active headcount (soft) |
| `member-delete` | perform | Permanently delete a member (hard) |
| `location-list` | search | List locations |
| `location-create` | perform | Add a location, with optional geofence |
| `activity-list` | search | List activities (time-tracking categories) |
| `project-list` | search | List projects |
| `client-list` | search | List billing clients (plan-gated) |
| `group-list` | search | List groups (teams/departments) |
| `time-entry-list` | search | List raw clock in/out events |
| `time-entry-clock-in` | perform | Clock a member in |
| `time-entry-clock-out` | perform | Clock a member out |
| `time-entry-update` | perform | Correct a time entry's activity/project/note |
| `time-entry-archive` | perform | Soft-delete a time entry (status flip) |
| `latest-time-entry-get` | read | Get a person's current clock state |
| `time-off-list` | search | List time-off requests |
| `time-off-create` | perform | Request time off (FullDay or Hours) |
| `time-off-update-status` | perform | Approve/reject/cancel a time-off request |
| `leave-balance-list` | search | List leave balances per person/policy |
| `timesheet-list` | search | Computed daily totals for a Day/Week/Month period |
| `tracked-time-report-get` | search | Cross-team tracked-time report, grouped/sub-grouped |

## Health checks

- **`auth:client-credentials`** (derived) — re-checks the token against `GET /v1/Organizations`.
- **`service`** — declared unavailable. `status.jibble.io` is a bespoke Next.js app, not an Atlassian
  Statuspage/Instatus instance: `GET /api/v2/status.json` (the Statuspage v2 convention) answers a
  404 "Page not found" shell, and the page ships no RSS/Atom feed to declare instead. No verifiable
  machine-readable status surface was found.
- **`quota`** — declared unavailable. The collection documents `X-Rate-Limit-Limit`/`Remaining`/
  `Reset` headers in exactly one place, with a live example on exactly one endpoint
  (`GetCurrentTotalsForScope`, not covered by this app), and `X-Rate-Limit-Limit`'s observed value
  (`"1s"`) is a window duration rather than a request-count ceiling — too thin an evidence base for a
  reliable probe.

Both declared absences are `severity: "informational"`, so they don't pin the app's overall verdict
at `unknown`.

## Scope

Confirmed to exist in Jibble's API but **not** implemented in this app (left out per this app's build
rule: don't guess, say so instead):

- **Kiosks** (`POST/GET /v1/Kiosks`) and **schedules** (`/v1/Schedules`) — configuration surfaces,
  not the day-to-day time-tracking/attendance path this app centers on.
- **Positions** (`/v1/Positions`) and **roles/authorization** (`authorization.prod.jibble.io`,
  `/v1/Roles`, `/v1/Users`) — a fifth host this app deliberately doesn't add to the egress allowlist.
- **Screenshots** (`/v1/Screenshots`) — a monitoring feature orthogonal to time tracking.
- **Payroll pay-periods** (`/v1/PayPeriodDefinitions`, `PayPeriodSummary`, `PayPeriodDetails`,
  `PayPeriods(id)/ChangeStatus`) and **calendars/holidays** (`/v1/Calendars`, `/v1/CalendarDays`).
- **Webhooks** — not present anywhere in the collection for this API (unlike several other apps in
  this pack).
- **The `Prefer: respond-async` bulk-export flow** — see "Also worth knowing" above.
- **`GetCurrentTotalsForScope`, `GetRecentActivities`, `GetRecentProjects`** — OData *function*
  endpoints with a non-standard `Name(arg=value,...)` call syntax rather than a plain
  resource path; left out rather than special-cased for three low-traffic reads.
