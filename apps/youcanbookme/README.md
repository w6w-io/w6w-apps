# YouCanBookMe

List, read, create, reschedule/cancel and delete YouCanBookMe (YCBM) bookings; list and read the
booking pages ("profiles") behind them; add appointment types and team members to a booking page.

- **Categories** — calendar
- **Auth methods** — basic
- **Actions** — 9
- **Egress allowlist** — `api.youcanbook.me`
- **Website** — https://youcanbook.me
- **API docs** — vendor's own docs page (`api.youcanbook.me/docs/index.html`) has been a dead
  meta-refresh to a client-rendered Stoplight SPA (`ycbm.stoplight.io`) since at least 2020; see
  "How this app was verified" below for the actual sources used.

## How this app was verified

The task's dead-end warning was real for the *live* docs page — a plain fetch of
`ycbm.stoplight.io` returns a large React-SPA shell with no statically embedded OpenAPI document
(Stoplight renders the spec client-side after hydration; the page's server-rendered `<script
id="store-data">` blob carries only workspace chrome and a short marketing `homeContent`
description, not endpoint definitions). Two things salvaged this app rather than a "SPEC DEAD END":

1. **The Wayback Machine has a full Swagger 2.0 export.** Before YCBM's docs page became a
   Stoplight redirect, it was a Swagger-UI 1.x page (`swagger-ui.js`, `lib/handlebars-4.0.5.js`
   found in a 2020-05-09 snapshot) that loaded its spec from `/v1/api-docs`. That JSON endpoint is
   itself archived — `https://web.archive.org/web/20210814150430id_/https://api.youcanbook.me/v1/api-docs?group=api`
   — an 81 KB Swagger 2.0 document with 18 paths and 47 schema definitions, including full
   `Booking`, `Profile`, `ProfileAppointmentType` and `ProfileTeamMember` field lists. This is the
   source for every endpoint path, param and response field this app declares.
2. **A live, unauthenticated probe (2026-09-01) confirmed which of those 18 archived paths are
   still real.** `GET https://api.youcanbook.me/v1/{accountId}`, `.../bookings` and `.../profiles`
   all answer `401 caligraph_not_using_basic_authentication` — an auth-gated route, i.e. still
   live. `.../remoteaccounts` and `.../queries` — both present in the 2021 archive — now answer
   `404 ycbm_api_http_resource_not_found`: **removed**. That matches the vendor's own *current*
   documentation: the live `homeContent` on `ycbm.stoplight.io` (fetched 2026-09-01, server-rendered
   into the page's `store-data` script) lists only four concepts — "Profiles / Bookings / Team
   Members / Appointment Types" — dropping the 2021 spec's Remote Accounts, Calendars, Events and
   Queries. This app implements only the four still-documented, still-live concepts.

Every action below was cross-checked against **both** sources (the archived schema for shape, the
live 401/404 probe for existence) before being written.

## Actions

Every account-scoped path requires `{accountId}` as an explicit path segment. This is not
implied by the credential — an Action never sees the credential (only the Auth `sign` hook does)
— so `accountId` is a required param on every action below, even though it is also the Basic auth
username.

| Key | Resource | Endpoint |
|---|---|---|
| `list-bookings` | booking | `GET /{accountId}/bookings` |
| `get-booking` | booking | `GET /{accountId}/profiles/{profileId}/bookings/{bookingId}` |
| `create-booking` | booking | `POST /{accountId}/profiles/{profileId}/bookings` |
| `update-booking` | booking | `PATCH /{accountId}/profiles/{profileId}/bookings/{bookingId}` |
| `delete-booking` | booking | `DELETE /{accountId}/profiles/{profileId}/bookings/{bookingId}` |
| `list-profiles` | profile | `GET /{accountId}/profiles` |
| `get-profile` | profile | `GET /{accountId}/profiles/{profileId}` |
| `create-appointment-type` | appointment-type | `POST /{accountId}/profiles/{profileId}/appointmenttypes/items` |
| `create-team-member` | team-member | `POST /{accountId}/profiles/{profileId}/teammembers/items` |

`update-booking` covers both a reschedule (`startsAt`/`endsAt`) and a cancellation
(`cancelled`/`cancellationReason`) in one PATCH action, since the archived `Booking` schema
documents both as plain partial-update fields on the same resource — distinct from
`delete-booking`, which permanently removes the row instead of marking it cancelled.

**Not modelled:** availability queries, remote calendar accounts, calendars and raw calendar
events (the `/queries`, `/remoteaccounts`, `.../calendars`, `.../events` paths) — all four are
present in the 2021 archived spec but the live API now 404s on `/queries` and `/remoteaccounts`
specifically (checked 2026-09-01); the other two were not independently probed once the pattern
was clear, since the vendor's own current documentation no longer lists any of the four. Profile
update/delete and appointment-type/team-member update/delete are also not modelled — the archived
spec documents them (`PATCH`/`DELETE` on `/profiles/{profileId}`,
`.../appointmenttypes/items/{id}`, `.../teammembers/items/{id}`), but this first pass covers
create + the full booking lifecycle only; adding them is a straightforward, low-risk follow-up
against the same verified schema rather than a gap with silent data loss.

## Auth

**`basic`** — the only method YCBM documents. HTTP Basic Auth:
`Authorization: Basic base64("<accountId>:<apiKey>")`.

- **Account ID** — a UUID, found at `app.youcanbook.me/#/account/security`.
- **API Key** — a long string starting `ak_`, found at the same page.

Verified 2026-09-01 against the vendor's own *current* documentation (the live `homeContent` on
`ycbm.stoplight.io`, under "Authentication": *"For the username, use your accountId. The password
will be your API key."*). Note this differs from the *2021 archived* spec's description ("use the
email address of the account" as username, with several alternate password forms — a password,
a one-time token, a session token) — the 2024/2026 live doc is trusted as current since it is the
newer, still-being-maintained source, and the simpler accountId+apiKey scheme is also the only one
this app implements or documents credentials for.

`test` and `afterConnect` both request `GET /{accountId}?fields=id,email` — explicitly listing
only those two fields rather than accepting the endpoint's full default field set, which the
archived spec shows includes `oneTimeToken` and `sessionToken`: live, sensitive
credential-adjacent material this app has no reason to pull into a stored or displayed response
(the same "don't let a whoami echo something sensitive" discipline applied elsewhere in this
pack, e.g. Mailjet's `/apikey` and Follow Up Boss's `/me`).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs on every workflow run (via `Auth.test`); the others are declared checks.

### Is the vendor up?

**Declared absence.** Checked 2026-09-01:

- `youcanbookme.statuspage.io` and `ycbm.statuspage.io` both 302 to `statuspage.io`'s own
  marketing page — the unclaimed-page decoy, not a real Atlassian Statuspage instance.
- `status.youcanbookme.com` answers 404 on a generic app shell — and is the wrong domain besides
  (the vendor's real domain is `youcanbook.me`, not `youcanbookme.com`).
- `youcanbook.freshstatus.io` answers 200 but with an empty, untitled Freshstatus "not found"
  shell.
- `youcanbook.instatus.com` 307-redirects to `instatus.com`'s own homepage; `youcanbookme.instatus.com`
  500s on a bare `error` body. Neither is a claimed page.

### Is this credential live?

This is what the `basic` Auth method's `test` hook does — the app's own health check, and the
only one of the three it performs itself. It probes:

```
GET /{accountId}?fields=id,email
```

Classified from the response **body**, not the status code: a non-2xx reports the vendor's own
`message` field when present; a 2xx response with no `id` field is treated as an unexpected shape
rather than success.

### Do we have quota left?

**Declared absence.** YCBM's own current documentation states a 429 exists ("Whenever you
encounter a 429 response this means your account hit the rate limit") but no budget, window, or
readable headroom endpoint. A live, unauthenticated probe (`GET /v1/bookings`, 2026-09-01, 400
response) carried no `x-ratelimit-*`/`ratelimit-*` header of any kind — only `X-Total` /
`X-Next-Cursor` pagination headers and standard CORS/security headers. Throttling exists but
cannot be read ahead of time, only budgeted from an observed 429.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `health/service.ts` (declared `unavailable`) |
| `quota` | quota | connection | signed | informational | `health/quota.ts` (declared `unavailable`) |
| `auth:basic` | credential | connection | signed | fatal | derived from the Basic auth method's `test` hook |

## Icon

`assets/icon.png` is YCBM's own favicon (`https://youcanbook.me/favicon.ico`, verified 200,
`image/png`, 800×800, 4.7 KB) — a real square "Y." vendor mark on the brand's green field. The
homepage's inline header SVG (`<a class="header__brand">`) is a full wordmark, not a square
symbol, so the favicon was used instead as the closer match to this pack's square-icon
convention; no icon was fabricated.

## Findings worth flagging

- **The vendor's canonical docs URL is a dead end for a live agent**, and the only way to recover
  a real spec was the Wayback Machine catching the *previous* generation of the docs page (a
  Swagger-UI 1.x site) before it became a client-rendered Stoplight SPA with no static spec
  export. If YCBM's Wayback history is ever pruned, this app's own source citations (this README,
  and the comments in `lib/client.ts` / `auth/basic.ts`) are the only remaining record of where
  the shape came from.
- **A live probe caught an API surface reduction the docs don't say anything about.** The 2021
  archived spec documents `/queries` and `/remoteaccounts` (calendar-account-level CalDAV/iCalendar
  bridging); both now 404 on the live API. Neither YCBM's live Stoplight `homeContent` nor
  anything else found says this happened — it was only visible by diffing an old spec against a
  live probe.
- **The archived `Booking` schema has a real-looking duplicate/typo'd field**: both
  `appointmentTypeIds` and `appointmentTypesIds` (note the extra "s") appear as separate array
  properties. This app uses `appointmentTypeIds` (the name matching the endpoint's own path
  segment, `appointmenttypes`) and does not attempt to guess which is authoritative for the other.

---

Researched 2026-09-01. Endpoint paths and schemas from a Wayback Machine capture
(`web.archive.org/web/20210814150430`) of `api.youcanbook.me/v1/api-docs?group=api`; existence and
auth scheme cross-checked against the live API and the live `ycbm.stoplight.io` project
description. Re-verify against a real, current OpenAPI export if YCBM ever republishes one.
