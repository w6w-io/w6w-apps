# OnceHub

Manage OnceHub bookings, booking calendars, contacts, users, teams and webhook subscriptions
over the OnceHub API v2.

- **Categories** — calendar
- **Auth methods** — api-key
- **Actions** — 30
- **Egress allowlist** — `api.oncehub.com`
- **Website** — https://www.oncehub.com
- **API docs** — https://help.oncehub.com/developers/overview/introduction/

## Actions

| Key | Resource | Endpoint |
|---|---|---|
| `booking-list` | booking | `GET /bookings` |
| `booking-get` | booking | `GET /bookings/{id}` |
| `booking-cancel` | booking | `POST /bookings/{id}/cancel` |
| `booking-request-reschedule` | booking | `POST /bookings/{id}/request-reschedule` |
| `booking-reassign` | booking | `POST /bookings/{id}/reassign` |
| `booking-mark-no-show` | booking | `POST /bookings/{id}/no-show` |
| `booking-calendar-list` | booking-calendar | `GET /booking-calendars` |
| `booking-calendar-get` | booking-calendar | `GET /booking-calendars/{id}` |
| `booking-calendar-time-slots-get` | booking-calendar | `GET /booking-calendars/{id}/time-slots` |
| `booking-calendar-schedule` | booking-calendar | `POST /booking-calendars/{id}/schedule` |
| `booking-calendar-one-time-link-create` | booking-calendar | `POST /booking-calendars/{id}/one-time-links` |
| `sms-notification-list` | notification | `GET /notifications/sms` |
| `user-list` | user | `GET /users` |
| `user-create` | user | `POST /users` |
| `user-get` | user | `GET /users/{id}` |
| `user-update` | user | `PATCH /users/{id}` |
| `user-delete` | user | `DELETE /users/{id}` |
| `user-scheduling-availability-get` | user | `GET /users/{id}/scheduling-availability` |
| `user-scheduling-availability-update` | user | `PATCH /users/{id}/scheduling-availability` |
| `team-list` | team | `GET /teams` |
| `team-get` | team | `GET /teams/{id}` |
| `contact-list` | contact | `GET /contacts` |
| `contact-create` | contact | `POST /contacts` |
| `contact-get` | contact | `GET /contacts/{id}` |
| `contact-update` | contact | `PATCH /contacts/{id}` |
| `contact-delete` | contact | `DELETE /contacts/{id}` |
| `webhook-create` | webhook | `POST /webhooks` |
| `webhook-list` | webhook | `GET /webhooks` |
| `webhook-get` | webhook | `GET /webhooks/{id}` |
| `webhook-delete` | webhook | `DELETE /webhooks/{id}` |

Not modelled, and deliberately left out rather than guessed at:

- **Master Pages, Booking Pages, Event Types, and Conversations as standalone resources.**
  They exist as `$ref`-only schemas in the spec (`MasterPage`, `BookingPage`, `EventType`,
  `Conversation`, `Bot`, `Website`, `Audience`) — returned as expandable sub-objects of a
  Booking, but **no path in the spec lists, gets, creates or deletes any of them directly**. There
  is no `GET /master-pages` or `GET /event-types` to call.
  Their data is reachable via `expand=` on `booking-get`/`booking-list` instead.
- **Webhook signature verification.** OnceHub signs each webhook payload with the `secret`
  returned by `webhook-create`/`webhook-get`
  (https://help.oncehub.com/developers/webhooks/webhook-signatures/), but verifying an inbound
  webhook is a trigger/ingest concern, not an outbound Action — this app declares no `triggers`
  today.

## Auth

**`api-key`** — the entire authentication story; OnceHub publishes no OAuth surface for
third-party integrations. Verified 2026-08-25 against
https://help.oncehub.com/developers/overview/authentication/.

- Minted at Settings → Account Integrations → APIs & Webhooks → API Keys → **Create API key**.
  Shown once at creation; up to 25 keys may be active per account, with no per-key scoping.
- Sent as a **bare custom header**, `API-Key: <key>` — **not** `Authorization: Bearer …`. This
  is the single easiest first mistake integrating against this API.
- `test` calls the dedicated validation endpoint, `GET /v2/test`
  (https://help.oncehub.com/developers/api/#tag/authentication/GET/test), whose body on success
  is `{ "message": "The API key is valid for account: <email>" }` — the account owner's email,
  never the key itself, so it is safe as both the connect-time probe and the derived
  `auth:api-key` health check.

### Classify by body, not status code

Every OnceHub error response — 400/401/403/404/409/422/429/500 alike — shares one JSON shape:

```json
{ "type": "authentication_error", "message": "Invalid API key.", "param": "id" }
```

`type` is one of `authentication_error`, `invalid_request_error`, `rate_limit_error`,
`api_error`. Confirmed live 2026-08-25: an unsigned request to `api.oncehub.com` returns exactly
`401 {"type":"authentication_error","message":"Invalid API key."}` (60 bytes) — matching the
spec's own documented example verbatim. A `403` also carries `type: "authentication_error"` but
means something different (the account's *plan* lacks API access entirely, not that the key is
wrong), so `auth/api-key.ts` surfaces the vendor's `message` rather than collapsing both into one
generic "invalid" verdict.

## Findings that would have cost someone a day

1. **The credential header is `API-Key`, not `Authorization: Bearer`.** Easy to assume Bearer by
   convention (most REST APIs use it); OnceHub's own docs are explicit that it's a bare custom
   header with no prefix.
2. **A deleted resource answers `200` in "redacted mode", not `404`.**
   https://help.oncehub.com/developers/overview/deleted-resources/: `GET` on a deleted booking
   calendar or contact returns `{ id, object, deleted: true }` with a normal 2xx status — code
   that treats "not 404" as "still exists" will be wrong. It also drops out of every `list`
   response silently.
3. **No quota to read despite real, fixed rate limits.** OnceHub documents 5 req/s per account
   and 200 req/5min per IP
   (https://help.oncehub.com/developers/overview/rate-limits/), but ships no `/usage` endpoint
   and no `X-RateLimit-*`/`RateLimit-*` response headers anywhere in the OpenAPI document —
   headroom can only be inferred from observed 429s, never read ahead of time.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs on every workflow run (via `Auth.test`); the others are declared checks.

### Is the vendor up?

**Declared absent.** `status.oncehub.com` is a real, OnceHub-owned domain (page title "OnceHub |
System Status") but is a bespoke Next.js app, not a Statuspage/Better-Stack/status.io instance.
Every machine-readable path tried against it returns 404: `/api/v2/summary.json`,
`/api/v2/status.json`, `/api/v2/components.json`, `/history.atom`, `/index.json`,
`/api/v1/status`. The page's initial server-rendered HTML carries no status text at all
("operational"/"degraded"/"outage" all zero matches) — the component grid is fetched
client-side by JavaScript this app cannot execute. Verified live 2026-08-25. Declared
`unavailable`, `severity: informational`, so the app relies on the `api-key` credential probe
instead of a fabricated or unreliable service signal.

### Is this credential live?

This is what the `api-key` Auth method's `test` hook does — the app's own health check, and the
only one of the three it performs itself:

```
GET /v2/test
```

Requires no scope beyond the key itself, and doubles as the source for `afterConnect`'s
connection label (`{{account.email}}`).

### Do we have quota left?

**Declared absence.** Fixed rate limits are documented (5 req/s per account, 200 req/5min per
IP) but no headroom endpoint or rate-limit response header exists anywhere in the spec, so
headroom cannot be read — only budgeted from observed 429s. Declared `unavailable`,
`severity: informational`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `health/service.ts` (declared `unavailable`) |
| `quota` | quota | connection | signed | informational | `health/quota.ts` (declared `unavailable`) |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

## Icon

`assets/icon.svg` is OnceHub's own icon-only mark, fetched verbatim from
`help.oncehub.com/assets/OH.svg` (their developer docs site's own asset host) — a colorful
swoosh/checkmark glyph distinct from their full wordmark logo (`oh-logo.svg`, not used here
because it is a horizontal text lockup, not a square icon).

---

Researched and endpoint-verified 2026-08-25 by fetching OnceHub's own OpenAPI 3.1 document
(`help.oncehub.com/developers/api/booking-calendars-api.yaml`, 4,337 lines, `info.version`
2.0.0) in full, plus live probes against `api.oncehub.com` and `status.oncehub.com`. Re-verify
if a probe starts failing for everyone at once.
