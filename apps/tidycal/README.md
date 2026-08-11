# TidyCal

Read and manage TidyCal scheduling — bookings, booking types, available timeslots, contacts and
teams — on the **TidyCal REST API**.

- **Categories** — calendar, productivity
- **Auth methods** — `personal-token` (bearer), `oauth2`
- **Actions** — 18
- **Health checks** — 3 (`api`, ~~`service`~~, ~~`quota`~~) + the derived `auth:personal-token` and
  `auth:oauth2`
- **Egress allowlist** — `tidycal.com`, and nothing else. There is no status host to add and no
  separate API host to add: `api.tidycal.com` is NXDOMAIN.
- **Website** — https://tidycal.com/
- **API docs** — https://tidycal.com/developer/docs/
- **Status page** — **none exists.** See [`health/service.ts`](health/service.ts).

TidyCal is a scheduling tool: you publish **booking types** (a 30-minute intro call, a paid
consultation), people pick a **timeslot** from your live availability, and the result is a
**booking** with a contact attached. The API is small — 18 operations — and the shape of almost every
workflow against it is the same three beats: list booking types, list the timeslots one has free,
book one.

> **Everything below was verified against TidyCal's own sources on 2026-08-11** — its OpenAPI 3.0.0
> document plus live probes against `tidycal.com`. Nothing here came from a third-party integration
> directory.

## Where the reference actually lives

`https://tidycal.com/developer/docs/` is a **Redoc bundle**: one 1,351,149-byte HTML file
(md5 `7c21f07a20e52c573787fa403baf7f97`) with the renderer *and* the specification inlined. The
machine-readable source is the `__redoc_state` JSON blob near the end of it; `spec.data` is a
complete OpenAPI 3.0.0 document — `info.version` `0.1`, 18 operations, 9 component schemas. Reading
the rendered prose instead of that blob is the slow way to do this.

It genuinely is one page: sub-paths like `/developer/docs/bookings` return a real, distinct 404
(7,975 bytes), not a catch-all shell.

## The five things most likely to cost you a day

### 1. The document mislabels its own query parameters

`GET /bookings` declares `starts_at`, `ends_at`, `cancelled`, `page` and `include_teams` as
`"in": "path"`. They are **query** parameters. Three independent reasons, none of which needs a
credential to check:

1. The path template is the literal string `/bookings` — there is no `{starts_at}` placeholder for a
   path parameter to bind to, so `in: "path"` is unsatisfiable as written.
2. `/bookings/{booking}` already occupies the one-extra-segment slot on that resource and binds an
   `integer` id, so a date could not route there anyway.
3. The *same* filters on `GET /teams/{team}/bookings` are declared `"in": "query"` four operations
   later in the same document.

This is the signature of a generator that emits `in: "path"` for anything not explicitly told
otherwise. Taking it literally produces a request to `/api/bookings/2026-01-01` — which does not
error usefully; see finding 4.

### 2. The same filters are renamed between two endpoints

| Question | `GET /bookings` | `GET /teams/{team}/bookings` |
| --- | --- | --- |
| From when | `starts_at` | `start_date` |
| Until when | `ends_at` | `end_date` |
| Cancellation | `cancelled` (only `true` documented) | `cancelled` (all three states documented) |
| Team bookings | `include_teams` | — (implicit) |
| Booker | — | `email` |
| Host | — | `host_id` |

Laravel ignores a query parameter it was not asked about, so sending `start_date` to `/bookings`
returns an **unfiltered list** rather than an error — a workflow that "filters to this week" and
silently processes every booking you have ever had. The two actions therefore keep separate param
fragments, and
[`tests/actions/team-booking-list.test.ts`](tests/actions/team-booking-list.test.ts) asserts neither
spelling has leaked into the other.

`cancelled` is also genuinely three-state on the team endpoint — TidyCal's own words: "Use true for
cancelled bookings, false for non-cancelled bookings, or omit for all bookings" — so `flag()` in
[`lib/client.ts`](lib/client.ts) sends `false` rather than dropping it. Collapsing `false` into
absence would make one of the three states unreachable.

### 3. The response envelope is inconsistent, so this app unwraps nothing

Read straight off the document's `responses`:

| Shape | Operations |
| --- | --- |
| `{"data": […]}` | the six collection reads |
| `{"data": {…}}` | the four creates |
| **the bare entity** | `GET /bookings/{id}`, `GET /me`, `GET /teams/{id}`, `PATCH /bookings/{id}/cancel` |
| `{"message", "team_user_id"}` | `POST /teams/{team}/users` |
| `{"message"}` | `DELETE /teams/{team}/users/{teamUser}` |

A client that unwraps `data` unconditionally returns `undefined` for the whoami — which is the
endpoint the health probe reads. Rather than guess a normalisation that cannot be confirmed without a
paid credential, **every action returns the vendor's parsed body verbatim** and each action's
`output` states the shape the document declares. Laravel pagination metadata, if TidyCal emits any,
passes through untouched for the same reason: the document declares only `data`, and this app does
not claim that is the only key.

### 4. The API shares an origin with the marketing site, and unknown paths 404 as a missing *user*

The host is `tidycal.com` — the same origin as the marketing site and the public booking pages.
`api.tidycal.com` does not resolve at all. So a path the API router does not know falls through to
the site's vanity-URL route:

```
GET https://tidycal.com/api/definitely-not-real
→ 404  {"message": "No query results for model [App\\Models\\User] api"}
```

That reads like "your account is gone" and has nothing to do with the account: Laravel is trying to
bind `api` as a *username*. A deeper unknown path (`/api/booking-types/1/questions`) answers the
ordinary `{"message":"The route … could not be found."}` instead. Both are distinguishable from the
`{"message":"Unauthenticated."}` a real endpoint returns unsigned, which is how every route in this
app was confirmed to exist **without a credential** — see below.

One more origin trap: the document's only server entry is the protocol-relative `//tidycal.com/api`.
`new URL()` cannot parse it, and a generator that pastes it verbatim emits `http://` — which really
does 302 to `https://tidycal.com:443/…`. The base URL is pinned as absolute `https://` once, in
[`lib/client.ts`](lib/client.ts).

### 5. `GET /api/me` is a safe probe here — and that was checked, not assumed

A vendor whoami returning the caller's own key is a real pattern (Mailjet's `/apikey`, Follow Up
Boss's `/me`), so the probe was chosen by reading the **response schema**. TidyCal's `User` has
exactly seven properties — `name`, `email`, `lifetime_pro_at`, `vanity_path`, `language`,
`profile_picture_url`, `currency_symbol` — and not one of them is a credential.

Every alternative is worse. `BookingType` carries `payment_platform_id` (the Stripe/PayPal connection
UUID). `Contact` is a list of *third parties'* names, emails, phone numbers **and `ip_address`**,
captured at booking time. A health probe's response is persisted and displayed; `/me` is the only
endpoint here that puts nothing but the account holder's own identity on the wire.

## The route map, verified without a credential

Laravel throws `MethodNotAllowedHttpException` during routing, **before** the auth middleware runs —
so a deliberately wrong verb reveals the exact verb set of a route to an unauthenticated caller. That
is how all 18 documented operations were confirmed live on 2026-08-11:

| Path | `Allow` header | Verdict |
| --- | --- | --- |
| `/api/bookings` | `GET, HEAD` | documented ✓ |
| `/api/bookings/1` | `GET, HEAD` | documented ✓ |
| `/api/bookings/1/cancel` | `PATCH` | documented ✓ — **PATCH only**, not POST or DELETE |
| `/api/booking-types` | `GET, HEAD, POST` | documented ✓ |
| `/api/booking-types/1` | *(404 route not found)* | **does not exist** |
| `/api/booking-types/1/timeslots` | `GET, HEAD` | documented ✓ |
| `/api/booking-types/1/bookings` | `GET, HEAD, POST` | POST documented ✓ · **GET is undocumented** |
| `/api/contacts` | `GET, HEAD, POST` | documented ✓ |
| `/api/contacts/1` | *(404 route not found)* | **does not exist** |
| `/api/me` | `GET, HEAD` | documented ✓ |
| `/api/teams` | `GET, HEAD` | documented ✓ |
| `/api/teams/1` | `GET, HEAD` | documented ✓ |
| `/api/teams/1/bookings` | `GET, HEAD` | documented ✓ |
| `/api/teams/1/users` | `GET, HEAD, POST` | documented ✓ |
| `/api/teams/1/users/2` | `DELETE` | documented ✓ |
| `/api/teams/1/booking-types` | `GET, HEAD, POST` | documented ✓ |

Three consequences, all of which shaped the app:

- **There is no single-booking-type read and no single-contact read.** `booking-type-list` and
  `contact-list` are the only sources of those IDs, which is why every action taking a
  `bookingType` says so in its hint.
- **`GET /api/booking-types/{id}/bookings` exists on the wire but is undocumented**, so this app does
  not call it. Its response shape, filters and pagination are unstated, and an endpoint the vendor
  has not committed to is one that can change without notice.
- **Cancel is `PATCH`.** Any other verb answers `405`. There is no delete-a-booking endpoint at all.

[`tests/index.test.ts`](tests/index.test.ts) derives the `METHOD /path` each action builds from that
action's own source and asserts the set equals the 18 documented operations exactly — so a typo'd
path, a wrong verb, or an endpoint borrowed from a sibling app fails the suite rather than 404ing at
runtime.

## Auth

Both methods TidyCal documents, and no more.

### `personal-token` (bearer)

`Authorization: Bearer {TOKEN}`, quoted verbatim from TidyCal's own reference. Create one at
Integrations → Advanced → "Manage API keys" → "Personal tokens"
(https://tidycal.com/integrations/advanced). The same paragraph states that **API access requires a
paid plan**, so "this account has no API key" is a billing fact, not a misconfiguration.

TidyCal documents no `?token=` query alternative, and this app never builds one: a workflow host logs
request URLs and does not log request headers.

**TidyCal cannot tell you which kind of auth failure you had.** Measured: unauthenticated, and with a
syntactically plausible fake bearer, `GET /api/me` answers byte-identically — `401`,
`{"message":"Unauthenticated."}` (30 bytes), no `WWW-Authenticate`, no error code. Unlike most APIs
there is no way to distinguish "the credential never reached the request" from "the credential is
wrong", so `test` reports one message naming both possibilities rather than guessing.

### `oauth2`

- Authorization URL — `https://tidycal.com/oauth/authorize`
- Token URL / refresh URL — `https://tidycal.com/oauth/token`

The server is Laravel Passport, and its grant dispatch is observable without registering a client.
`POST /oauth/token` carrying only a `grant_type` (measured 2026-08-11):

| `grant_type` | response | enabled? |
| --- | --- | --- |
| `authorization_code` | `invalid_request` · "Check the `client_id` parameter" | yes |
| `refresh_token` | `invalid_request` · "Check the `client_id` parameter" | yes |
| `client_credentials` | `invalid_request` · "Check the `client_id` parameter" | yes |
| `password` | `unsupported_grant_type` | no |
| `bogus_grant` | `unsupported_grant_type` | no |

A grant that reaches client validation is enabled; one that does not is not. That is what makes
`refreshUrl` a measured fact rather than an assumption.

**Deliberately not declared**, because they cannot be confirmed:

- **`scopes`** — TidyCal documents no scope vocabulary for a REST client. The only scope it names
  anywhere is `mcp:scheduling:read`, which belongs to its separate, read-only MCP connector
  (`tidycal.com/mcp`). Requesting a guessed scope name is how an authorization request gets rejected
  outright.
- **`pkce`** — Passport supports it, but whether TidyCal's clients are registered as *public* clients
  is not stated and cannot be determined without registering one. `pkce: true` against a confidential
  client breaks the exchange.

Both methods probe `/api/me` (see finding 5) and both publish the same three Connection-label fields
— `name`, `email`, `vanity_path` — dropping the other four.

## Actions

| Key | Type | Operation |
| --- | --- | --- |
| `booking-list` | search | `GET /bookings` |
| `booking-get` | read | `GET /bookings/{booking}` |
| `booking-cancel` | perform | `PATCH /bookings/{booking}/cancel` |
| `booking-type-list` | search | `GET /booking-types` |
| `booking-type-create` | perform | `POST /booking-types` |
| `timeslot-list` | search | `GET /booking-types/{bookingType}/timeslots` |
| `booking-create` | perform | `POST /booking-types/{bookingType}/bookings` |
| `contact-list` | search | `GET /contacts` |
| `contact-create` | perform | `POST /contacts` |
| `account-get` | read | `GET /me` |
| `team-list` | search | `GET /teams` |
| `team-get` | read | `GET /teams/{team}` |
| `team-booking-list` | search | `GET /teams/{team}/bookings` |
| `team-user-list` | search | `GET /teams/{team}/users` |
| `team-user-add` | perform | `POST /teams/{team}/users` |
| `team-user-remove` | perform | `DELETE /teams/{team}/users/{teamUser}` |
| `team-booking-type-list` | search | `GET /teams/{team}/booking-types` |
| `team-booking-type-create` | perform | `POST /teams/{team}/booking-types` |

### Idempotency

TidyCal accepts **no idempotency key on any operation**, so the flag is judged purely on whether a
retry converges.

`idempotent: true` — `booking-cancel`, `team-user-remove`. Both converge: a retry finds the work
already done and TidyCal says so (`400 Booking is already cancelled`, `422 User not found in team`)
rather than doing it twice.

`idempotent: false` — the five creates. `team-user-add` is the one where the flag does real work: it
**sends an invitation email**, and a retry after a lost response answers `422 User already invited or
already a member` — reporting failure for work that succeeded, having already mailed someone.
Retrying that is a human decision.

### Notes on individual actions

- **`timeslot-list` is the one worth building a workflow around.** TidyCal resolves the availability
  schedule, existing bookings, connected-calendar conflicts, padding and the minimum-notice threshold
  and hands back the result. Nothing in this app reproduces that arithmetic. Both window bounds are
  required and both are UTC — they are the only parameters in the whole document declared
  `"in": "query", required: true`.
- **`booking-create` has two response shapes from one request.** A single booking (`starts_at`)
  answers `{"data": {Booking}}`; a package booking (the `bookings` array of session start times)
  answers `{"data": [{Booking}, …]}`. When `bookings` is present, `starts_at` is **ignored** — this
  app drops it rather than sending a value documented to be discarded, so a request log cannot claim
  a time that was never booked.
- **`contact-create` is gated on a lifetime subscription.** TidyCal documents `402 Payment Required —
  Lifetime subscription required` on this operation and nowhere else. A paid plan is enough to *use*
  the API; it is not enough to use this. Nothing exposes the entitlement in advance — the closest
  signal is `lifetime_pro_at` on `account-get`, a timestamp rather than a statement about this
  endpoint.
- **`contact-list` returns third parties' personal data**, including each contact's captured
  `ip_address`. That is why no health check in this app reads it, even though it would work as a
  liveness probe.
- **`team-user-list` returns *membership* ids, not user ids.** `team-user-remove` takes that
  membership id; the `host_id` filter on `team-booking-list` takes a user id. Nothing in the document
  maps one to the other, so treat them as separate namespaces. The row also carries no role, despite
  `team-user-add` accepting one.
- **`booking-type-create` requires a `description`.** Four of the eighteen body fields are required —
  `title`, `description`, `duration_minutes`, `url_slug` — and `description` being one of them is the
  surprise: an empty one is a `422`, not a default. Note also the asymmetry `booking_threshold` (in)
  / `booking_threshold_minutes` (out).
- **`booking-type-create` and `team-booking-type-create` share one param fragment**, because TidyCal
  declares byte-identical request schemas for both. A test asserts they stay identical.
- **The personal booking-type list never includes team booking types.** There is no `include_teams`
  flag on it (unlike the booking list), so `team-booking-type-list` is the only way to see them.

## Health checks

### `api` — the only live probe there is

An **unauthenticated** `GET https://tidycal.com/api/me`. `kind: "dependency"`, `scope: "app"`,
`credential: "none"`, no `network.allow` — the host is already the app's own, and there is nothing to
widen to.

**A 401 is the PASS.** The probe carries no credential, so TidyCal rejects it — and that rejection is
the strongest evidence available that the service is healthy: DNS resolved, TLS terminated,
Cloudflare passed the request through, Laravel routed it to the API controller and the auth
middleware ran. Judging by the HTTP status would report TidyCal down forever. Credential validity is
the derived `auth:*` checks' job; conflating the two is how "the API is down" and "your token
expired" get reported as each other.

The interesting failure is the **404**: because the site and the API share one origin (finding 4), a
404 here does not mean an endpoint moved, it means the API router is no longer mounted at `/api` and
every action in this app is dead. That is a `down`. So is a non-JSON body (an edge error page, a
captive portal). An unexpected 2xx is `unknown` — surprising, but not evidence of an outage, and this
check will not invent one.

It is filed as `dependency` rather than `service` on purpose: it proves *the API is answering us*,
which is a narrower and honestly weaker claim than "the vendor has declared itself healthy".

### ~~`service`~~ — a declared absence, at `informational` severity

**TidyCal publishes no status page.** Checked four ways on 2026-08-11:

1. **DNS** — `status.tidycal.com` is NXDOMAIN. So is `status.tidycal.io`.
2. **The Statuspage trap** — `tidycal.statuspage.io` *does* resolve, because Atlassian wildcards that
   zone, and answers **HTTP 200** to `/api/v2/summary.json`. It is not TidyCal's page: 127,719 bytes
   of `text/html`, byte-identical (md5 `6158499584bf…`) for `/api/v2/summary.json` and `/`. That is
   the known signature of Atlassian's unclaimed-subdomain page, served for every path. A check that
   trusted the 200 would report "TidyCal is fine" through a real outage.
3. **The Instatus trap, for completeness** — `tidycal.instatus.com` answers 200 with 222,453 bytes of
   HTML, the same pattern on the other common provider.
4. **The vendor's own reference** — no status page, incident feed or uptime URL anywhere in it.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict at
`unknown` forever.

### ~~`quota`~~ — a declared absence, at `informational` severity

**No quota or rate-limit signal exists.** Verified two ways:

1. **Nothing on the wire.** A full header dump of `GET https://tidycal.com/api/me` (unauthenticated,
   and again with a plausible fake bearer) carried exactly `date`, `content-type`,
   `server: cloudflare`, `cache-control: no-cache, private`, `cf-cache-status`, `set-cookie:
   __cf_bm=…` and `cf-ray`. No `X-RateLimit-Limit`, no `X-RateLimit-Remaining`, no `Retry-After` —
   which for a Laravel API also implies the `throttle` middleware is not on the group, since it emits
   those headers ahead of authentication.
2. **Nothing in the documentation.** No `429` response is declared on any of the 18 operations, and
   the reference prose never uses "rate", "limit" or "quota" about requests.

TidyCal's real constraints are commercial and enforced at the point of use — API access requires a
paid plan; `POST /api/contacts` answers `402` without a lifetime subscription — and neither is
readable as headroom in advance. Reporting either as a quota would be inventing a number.

## Deliberately not covered

- **`GET /api/booking-types/{id}/bookings`** — exists on the wire (`Allow: GET, HEAD, POST`) but is
  **undocumented**. Its response shape, filters and pagination are unstated.
- **Webhooks / triggers** — TidyCal's API publishes no subscription endpoint, so nothing in this app
  can start a workflow from a booking. Polling `booking-list` is the only option.
- **Updating or deleting a booking type, a contact, or a booking** — no such operations exist. The
  only mutations TidyCal exposes are the five creates, the cancel, and the team-membership remove.
- **Rescheduling** — `/api/bookings/{id}/reschedule` does not exist (404, measured). Cancel and
  re-book.
- **The MCP connector** (`tidycal.com/mcp`) — a separate, read-only OAuth 2.1 surface with its own
  10 tools and its own `mcp:scheduling:read` scope, gated to Pro accounts. It is not this REST API
  and shares nothing with it but the vendor.
- **Booking-type questions and locations** — surfaced by the MCP connector's `get_booking_type` and
  `list_locations` tools, but no REST endpoint lists them. `booking-create`'s
  `booking_questions` therefore needs question IDs taken from a previous booking's `questions`
  array, and the hint says so.
- **The `client_credentials` grant** — enabled on the token endpoint (measured), but undocumented and
  useless here: it yields a machine token with no user context, and every operation in this API is
  scoped to an account.

## Icon

[`assets/icon.svg`](assets/icon.svg) is TidyCal's own mark, downloaded **verbatim** and not modified:

- **Source** — https://tidycal.com/img/logo-icon.svg
- **Bytes** — 2,029
- **md5** — `854fc2bca908c95fd52bc3ba228990ad`
- **viewBox** — `0 0 74.9000015 70.8149261`, one path in TidyCal's single brand blue `#1569ef`

Distinct from the vendor's 404 shell, which is 153 bytes of `text/html` (md5 `f1d1d6bfe034…`) — so
this is a real asset, not a catch-all. `tidycal.com/favicon.svg` *is* that 404 shell and was not
used. The horizontal wordmark at `/img/logo-blue.svg` (5,348 bytes, md5 `1f2442c6443c…`) is real too
but is a 4:1 logotype, wrong for a square app icon.

A test in [`tests/index.test.ts`](tests/index.test.ts) pins the byte length, the viewBox and the
brand colour, so a redraw fails the suite. Format with **`deno task fmt`**, never bare `deno fmt` —
the bare form rewrites `assets/` and would falsify the verbatim claim above.

## Layout

```
tidycal/
├── package.json                 # identity + w6w manifest block
├── index.ts                     # AppDefinition: 18 actions, 2 auth methods, 3 health checks
├── lib/client.ts                # base URL, request/response handling, error formatting
├── lib/params.ts                # shared Param fragments; the mislabelled/renamed-parameter notes
├── auth/personal-token.ts       # bearer; the /me probe and why
├── auth/oauth2.ts               # authorization_code + refresh, both measured live
├── health/api.ts                # the one live probe (401 = pass)
├── health/service.ts            # declared absence: no status page
├── health/quota.ts              # declared absence: no rate-limit signal
├── actions/                     # 18 files, one per documented operation
├── assets/icon.svg              # the vendor mark, byte-for-byte
└── tests/                       # 113 tests: entry module, every action, client, auth, health
```

## Development

```bash
deno task validate   # manifest + sandbox rules against the pack auditor
deno task check      # typecheck
deno task lint
deno task fmt        # scoped — never touches assets/
deno task test
```

There is no `deno` binary on the devcontainer host; run these inside the `api` compose service:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/tidycal && deno task test'
```
