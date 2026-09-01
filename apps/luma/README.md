# Luma

Manage events, guest registration and ticket types on a **Luma calendar**, on the Luma Public API.

- **Categories** — calendar, commerce
- **Auth methods** — api-key
- **Actions** — 29
- **Health checks** — 2 (`quota`, ~~`service`~~) + the derived `auth:api-key`
- **Egress allowlist** — `public-api.luma.com`
- **Website** — https://lu.ma/
- **API docs** — https://docs.luma.com/reference/getting-started-with-your-api
- **OpenAPI** — https://public-api.luma.com/openapi.json

> **Everything below was verified against Luma's own sources on 2026-09-01** — its machine-readable
> OpenAPI 3.1 document ([`public-api.luma.com/openapi.json`](https://public-api.luma.com/openapi.json),
> 195,606 bytes, `info.title` "Luma API"), the `docs.luma.com` pages it links (getting started, API
> conventions, rate limits), and live probes against `public-api.luma.com` and the candidate status
> hosts. Nothing here came from a third-party integration directory.

## Three things worth knowing before you build with this

### 1. An API key is scoped to exactly one calendar — there is no `calendarId` param anywhere

"API keys are scoped to a single calendar. Each calendar you want to manage via the API needs its
own key, and each key only grants access to the calendar it was created on"
(docs.luma.com/reference/getting-started-with-your-api). Every calendar-level Action in this app
(`calendar-get`, `calendar-update`, `calendar-admins-list`, `calendar-events-*`, `contact-list`)
therefore takes **no calendar identifier at all** — the calendar is entirely determined by which key
signed the request. A Connection = one calendar. Managing several calendars means several
Connections.

### 2. The vendor's own Statuspage exists but refuses to answer — this app declares it unavailable

`luma.statuspage.io/api/v2/summary.json` answers **401** `"Your page is inactive. Please include an
API key to access this resource."` — Statuspage's own message for a page whose owner has not
published it, the exact pattern this pack already handles for Deel
([`apps/deel/health/service.ts`](../deel/health/service.ts)). `status.lu.ma` and `status.luma.com`
don't resolve (DNS failure, verified 2026-09-01), and `lu-ma.statuspage.io` is the unclaimed-subdomain
redirect to Statuspage's own marketing page, not Luma's. There is nothing to parse, so `service` is
declared `unavailable` at `severity: "informational"` — see [`health/service.ts`](health/service.ts)
for why that severity is load-bearing (an `unavailable` check always reports `unknown`, which
outranks `ok` in the roll-up; anything but `informational` would pin this app's verdict there
forever).

### 3. `X-RateLimit-Reset`'s unit is undocumented, and this app refuses to guess it

Luma documents `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` /
`Retry-After` headers on authenticated responses (docs.luma.com/reference/rate-limits), but the
"timestamp" `X-RateLimit-Reset` carries is never given a unit — seconds, milliseconds, and ISO string
are all plausible, and this app holds no live calendar key to observe the real value on the wire.
[`health/quota.ts`](health/quota.ts)'s `parseResetHeader` only converts the header to `resetAt` when
it parses as an unambiguous 10-digit Unix-seconds epoch landing after 2020 — the convention this
pack's other quota checks (GitHub, HubSpot, Datadog) already use for a header of this name. Anything
else is reported in `message` instead of being asserted as a date nobody verified.

## Auth

`x-luma-api-key: <key>` — a raw header value, **no** `Bearer` prefix (confirmed both in the OpenAPI
`securitySchemes.apiKeyAuth` block and in Luma's own curl example). The credential probe is
`GET /v1/users/get-self`: it requires a credential (measured live — no header answers `400
{"message":"Please provide an API key.","code":null}`; a bad key answers `401
{"message":"You are not signed in.","code":null}`), and its response (`id`, `name`, `avatar_url`,
`email`, `first_name`, `last_name`) carries no credential material of any kind to strip — unlike
Apify's equivalent whoami, there is no embedded secret here. `afterConnect` publishes the connected
user's `name`/`email` for the connection label.

## Actions

**User** — `user-get-self`.

**Calendar** — `calendar-get`, `calendar-update`, `calendar-admins-list`, `calendar-events-list`,
`calendar-events-lookup`, `calendar-events-add`, `calendar-events-approve`,
`calendar-events-reject`, `contact-list`.

**Event** — `event-get`, `event-create`, `event-update`, `event-cancel-request`, `event-cancel`
(cancellation is Luma's own two-step flow: request a short-lived `cancellation_token`, then confirm
with it — mirrored here as two Actions rather than collapsed into one, since a single call cannot
both ask for confirmation and act on it).

**Host** — `event-host-add`, `event-host-remove`, `event-host-update`.

**Guest / registration** — `guest-list`, `guest-get`, `guest-add` (registers a guest directly, in the
approval status you choose), `guest-update-status`, `guest-update-tickets`, `guest-send-invites` (a
*soft* invite the recipient must accept — the difference from `guest-add` that decides which one a
workflow wants).

**Ticket type** — `ticket-type-list`, `ticket-type-get`, `ticket-type-create`, `ticket-type-update`,
`ticket-type-delete`.

### Left out, and why

Luma's OpenAPI surface also covers coupons (event- and calendar-level), event/contact tags, webhooks
(`v1`/`v2`), calendar memberships, cross-calendar organization endpoints, and CDN image uploads. None
of those were built for this v1: the task scope was events, guest/registration and calendars, and
each of the left-out areas is either adjacent tooling (coupons, tags) or a different integration shape
entirely (webhooks are inbound, not an Action; organizations and memberships are a second axis this
app's single-calendar Connection model doesn't yet represent). Nothing here was guessed — every
endpoint this app *does* implement was checked field-by-field against the live OpenAPI document.

Two structural choices, made rather than left implicit:

- **`registrationQuestions`, `feedbackEmail`, `ticketTypes` (on `event-create`) and
  `geoAddressJson`** are `json`-typed params rather than a hand-built sub-form. Luma's own schema
  defines `RegistrationQuestion` as a 15-variant tagged union and `geo_address_json` as a `oneOf` with
  no single flat shape — the same reasoning this pack already applies to Apify's Actor input
  (`lib/params.ts` in `apps/apify`).
- **`theme` and `font` (on `event-create`/`event-update`) are free-text `string` params, not
  `select`.** Luma documents 36 themes and 23 fonts and states plainly that both "may be retired over
  time" with a documented fallback (`standard` / the theme's default) — a hard-coded option list
  would silently go stale the day Luma retires one. The current lists are copied verbatim into each
  param's hint text instead.

## Health checks

| Check | Kind | Credential | What it does |
|---|---|---|---|
| `service` | service | none | Declared `unavailable` (`informational`) — Luma's Statuspage exists but answers 401 everywhere. See finding #2 above. |
| `quota` | quota | signed | Reads `X-RateLimit-Limit`/`X-RateLimit-Remaining` off `GET /v1/users/get-self` (the same call `auth:api-key` already makes) — `ok` under 90% used, `degraded` at/above it, `down` at 0 remaining or on a live `429`. |
| `auth:api-key` (derived) | credential | — | Projected automatically from the Auth method's `test` hook. |

## Rate limits

200 requests/minute per calendar API key (500/minute for organization keys, not applicable to this
app's per-calendar Connection model), shared across GET and POST. Exceeding it answers `429` and
blocks the key for a full minute (docs.luma.com/reference/rate-limits, fetched 2026-09-01).

## Development

```bash
deno task validate   # manifest conformance (@w6w/validator via ../../_tools/audit.ts)
deno task check       # typecheck
deno task lint        # deno lint
deno task test         # unit tests, mocked HookContext
deno task fmt          # format (lineWidth 100, semicolons, double quotes)
```
