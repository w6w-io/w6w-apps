# Sendblue

Send and receive iMessage, SMS, and RCS business messages — plus contacts, webhooks, TOTP,
seats, location sharing, and phone verification — through the **Sendblue REST API**.

- **Categories** — communication
- **Auth methods** — api-keys (two custom headers: `sb-api-key-id` + `sb-api-secret-key`)
- **Actions** — 47
- **Health checks** — `service` (declared unavailable), `quota` (declared unavailable), `lines`
  (real probe) + the derived `auth:api-keys`
- **Egress allowlist** — `api.sendblue.co` only
- **Website** — https://sendblue.com/
- **API docs** — https://docs.sendblue.com/api-v2/

> **Everything below was verified on 2026-08-25** against Sendblue's own documentation portal
> (`docs.sendblue.com`) — the hand-authored `api-v2/*` guide pages (Messages, Media, Reactions,
> Carousel, Read Receipts, Typing Indicators, RCS, Contact Sharing, Line Provisioning,
> Subaccounts, TOTP, Location Sharing, Verify, Contacts, Seats) plus the parallel SDK-generated
> `api/resources/*` reference (Stainless, built from Sendblue's own OpenAPI document) — and live
> probes against the API host. Nothing here came from a third-party integration directory.

## The four things most likely to cost someone a day

### 1. The docs disagree with themselves on the API host — `.co` vs `.com`

Every worked example in the SDK-generated reference (`api/resources/*`) calls
`https://api.sendblue.co`. Every hand-authored guide page (`api-v2/messages`,
`getting-started/credentials`, `api-v2/subaccounts`, `api-v2/line-provisioning`, …) just as
consistently calls `https://api.sendblue.com` instead — the SAME endpoints, two different hosts,
depending only on which doc page you copied the curl from.

Both answer identically live (an unauthenticated `POST /api/send-message` returns the same
`403 {"message":"Did not get inputs for authorization"}` on both), but DNS tells them apart:

```
api.sendblue.co   -> CNAME gr-production-alb-*.us-east-2.elb.amazonaws.com   (the production ALB)
api.sendblue.com  -> Cloudflare anycast (172.67.75.116)                       (fronts the same backend)
```

This app calls `api.sendblue.co` throughout — it's what every machine-generated example names and
it points straight at the origin. `network.allow` in `package.json` lists only that host.

### 2. Four path vintages coexist on one host, sometimes in the SAME resource area

There is no single versioning convention:

| Shape | Examples |
|---|---|
| Bare, unversioned | `/api/send-message`, `/api/status`, `/api/upload-media-object`, `/api/send-reaction`, `/api/mark-read`, `/api/request-location`, `/api/location`, `/api/evaluate-service` |
| Legacy singular | `DELETE /api/message/:message_handle` — the ONLY message operation with no `/v2` form |
| `/api/v2/...` | messages list/get, contacts, seats, TOTP, Verify Services/Verifications, line state, events |
| Bare `/v3/...` (no `/api` at all) | verified contacts (`/v3/verified-contacts`), temporary bearer tokens (`/v3/auth/tokens`) |

`/api/account/webhooks` is its own odd one out even inside the `/api/v2` tier: no `/v2` segment at
all. Every path in this app's `lib/client.ts` and action files was confirmed individually against a
worked example — none was inferred from a sibling endpoint's shape, because that is exactly how you
end up 404ing on a guessed `/v2`.

### 3. Sendblue Verify is an INVERTED OTP — there is no "submit the code" endpoint

Unlike Twilio Verify (send a code, the user types it into your app, you `POST` it to a
`.../checks` endpoint), Sendblue's Verify asks the recipient to **text the code back**:
`verify-verification-create` returns `delivery_target.{code, pool_number}`, and the recipient must
send that exact code, from the number being verified, to `pool_number`. Verification then happens
automatically, server-side, the instant that inbound text arrives. Confirmed by reading the full
Verify guide end to end: no `.../verifications/.../check` path exists anywhere in this API. A
caller who builds a code-input form has nowhere to `POST` it — the only integration point is
polling (`verify-verification-get`/`-list`) or a webhook until `status` becomes `approved`,
`expired`, or `canceled`.

### 4. Two ordinary reads hand back live credentials — one is legitimate, the other is out of scope

`GET /api/v2/users/me`-style whoami traps don't exist here, but two documented endpoints do return
working secrets in an otherwise ordinary response:

- `POST /accounts/lines/request-child-account` (Subaccounts, agency-only) returns the new child
  account's `api_key`/`api_secret` in plaintext. This is legitimate — provisioning a subaccount
  credential IS the entire point of the call — which is exactly why this app does **not** implement
  it: see "What's deliberately not implemented" below.
- The TOTP `secrets` create response returns the base32 secret **once**, on creation only —
  `totp-secret-list` never includes it. This is also by design (the whole feature is "let an agent
  read its own 2FA code"), so `totp-secret-create` passes it through unmodified.

## Auth

Two custom headers on every request — **not** a bearer token, **not** `Authorization`:

```
sb-api-key-id: <API Key>
sb-api-secret-key: <API Secret>
```

Confirmed against `docs.sendblue.com/getting-started/credentials` and every worked example across
the reference. The credentials page itself writes the header names upper-cased
(`SB-API-KEY-ID`); HTTP header names are case-insensitive, and this app follows every code sample's
lower-case form.

The credential-liveness probe is `GET /api/v2/contacts/count` (`auth/api-keys.ts`) — chosen over
`GET /api/v2/seats/count` or `GET /api/v2/lines/state` because it needs nothing beyond a plain
messaging-plan account (no team seats, no assigned phone line), and its response,
`{"count": number}`, carries no phone numbers, message content, or credential material.

**Two failure shapes were confirmed live and are NOT the same shape** — the reason `test()`
classifies from the response body rather than the status code:

| Cause | Status | Body |
|---|---|---|
| No credential headers reached the request | `403` | `{"message": "Did not get inputs for authorization"}` — no `status` field |
| A wrong-but-present key/secret pair | `401` | `{"status": "ERROR", "message": "Invalid Credentials"}` |

## Health checks

- **`service`** — declared `unavailable`, `informational` severity. `sendblue.statuspage.io` is
  the classic unclaimed-Statuspage decoy (302s to `statuspage.io`'s own marketing homepage).
  `status.sendblue.com` IS real and Sendblue-branded, but it's a bespoke app with no discoverable
  machine-readable feed — `/api/v2/summary.json`, `/api/v2/status.json`, `/api/status`,
  `/status.json`, `/api/health`, `.well-known/status`, and an RSS `/rss`/`/feed` all 404 with the
  same generic error page (checked 2026-08-25).
- **`quota`** — declared `unavailable`, `informational` severity. Sendblue's own rate-limit
  documentation states every ceiling is enforced by outright `429` refusal with no stated
  remaining count, and a live response carries no `X-RateLimit-*`/`RateLimit-*` header at all
  (checked against both an authenticated and unauthenticated request).
- **`lines`** — a real probe. `GET /api/v2/lines/state` returns a per-line
  `ONLINE`/`OFFLINE`/`DEGRADED`/`UNKNOWN` snapshot for every Sendblue number on the account; this
  is a `dependency` check (this account's own line health), not a `service` one (vendor-wide
  status), since a shared or grace-period line can degrade independently of any platform incident.
  Zero assigned lines reports `unknown`, not `down`.

## Actions (47)

**Messages** — `message-send`, `message-list`, `message-get`, `message-status-get`,
`message-delete` (soft delete only — does not unsend/recall on-device), `message-app-card-update`

**Groups** (beta per the vendor) — `group-send-message`, `group-modify`

**Media / reactions / receipts / typing / lookup / carousel** — `media-upload-from-url`,
`reaction-send`, `read-receipt-send`, `typing-indicator-send`, `lookup-number`, `carousel-send`

**Contacts** — `contact-list`, `contact-create`, `contact-get`, `contact-update`,
`contact-delete`, `contact-count`, `contact-verify`, `contact-opt-out`, `contact-bulk-create`,
`contact-bulk-delete`

**Webhooks** — `webhook-list`, `webhook-create` (appends), `webhook-update` (replaces
everything), `webhook-delete`

**TOTP** — `totp-get-code`, `totp-secret-create`, `totp-secret-list`, `totp-secret-delete`

**Seats** — `seat-list`, `seat-count`, `seat-get`

**Lines** — `line-state-get`

**Location Sharing** — `location-request-create`, `location-list`, `location-get`

**Verified Contacts** (free-plan recipient verification) — `verified-contact-create`,
`verified-contact-list`, `verified-contact-get`

**Verify** (inverted-OTP phone verification — see finding #3 above) — `verify-service-create`,
`verify-service-list`, `verify-verification-create`, `verify-verification-get`,
`verify-verification-list`

## What's deliberately not implemented, and why

- **`POST /api/upload-file`** (direct multipart binary upload) — takes a raw file body under a
  `file` form field, which does not fit this app's JSON/param-shaped request model.
  `media-upload-from-url` (`POST /api/upload-media-object`) covers the common workflow case: source
  media already has a URL.
- **Location watching (`GET /api/location/{number}/watch`) and account event streaming
  (`GET /api/v2/events`)** — both are Server-Sent Events streams with no bounded end, not a
  request/response `execute()` can model. `verify-verification-list`/`-get` and `message-list` are
  the documented reconciliation path for the same state.
- **Subaccounts (`/accounts/lines/request-child-account`, `/accounts/lines/available-area-codes`)
  and Line Provisioning (`/accounts/lines/provision-*`, `/accounts/lines/deprovision-*`)** — both
  are agency-only per the vendor's own docs, and line provisioning literally **charges the card on
  file** with no dry-run beyond its own preview/confirm token flow. Out of scope for a first-party
  integration app rather than something to guess at.
- **Contact Sharing (Name & Photo Sharing profiles) and the two `auto-*` account-setting toggles**
  (`auto-mark-read`, `auto-typing-indicator`) — real, documented, low-risk endpoints that were cut
  for scope discipline in this first pass, not because anything about them is unclear.
- **`POST /v3/auth/tokens` (mint a scoped temporary bearer token) and its revoke** — a legitimate,
  simple pair of calls, also cut for scope; the resulting token is not wired into this app's own
  `sign` hook regardless; it would need a second Auth method to be useful as a Connection
  credential.
- **The Verify "hosted widget" option** (`hosted: {...}` on verification create) — its response
  bakes a one-session bearer token into a URL fragment that the vendor's own docs say must never be
  logged or persisted, which conflicts with a workflow step's output being stored and displayed.
  The plain `to`-only flow is fully supported.

## Format

Formatted with `deno task fmt` — never bare `deno fmt`, which would rewrite `assets/icon.svg` (the
vendor's own mark, extracted verbatim from `sendblue.com`'s logo SVG) and falsify this file's
verbatim-mark claim.
