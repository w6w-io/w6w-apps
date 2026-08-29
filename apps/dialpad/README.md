# Dialpad

Calls, SMS, users, contacts, call routers, rooms and webhooks on **Dialpad**, the cloud business
phone and contact center platform, over its **Admin API v2**.

- **Categories** — communication, support
- **Auth methods** — api-key
- **Actions** — 35
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `dialpad.com` (the `service` check adds `status.dialpad.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://dialpad.com/
- **API docs** — https://developers.dialpad.com/reference
- **Status page** — https://status.dialpad.com/

> **Everything below was verified against Dialpad's own sources on 2026-08-29** — its
> machine-readable OpenAPI 3.1 document, fetched live from
> `dash.readme.com/api/v1/api-registry/cwu1asmtbsrjuf` (the registry id
> `developers.dialpad.com/reference` itself resolves in its server-rendered page props,
> `oasPublicUrl: "@dialpad/v1.0#cwu1asmtbsrjuf"`), plus live probes against `dialpad.com`,
> `sandbox.dialpad.com` and `status.dialpad.com`. Nothing here came from a third-party integration
> directory.

## The three things most likely to go wrong

### 1. Two live signing secrets hide in ordinary reads

This is the finding that shaped the app. A **webhook** and an **API call router** each carry a
`signature` object — `{algo, secret, type}` — and `secret` is the literal string Dialpad signs
outbound payloads with. It comes back **in full** on every create, get, list and update response.
Confirmed in the vendor's own OpenAPI example for `POST /api/v2/webhooks`:

```json
{ "hook_url": "https://test.com/webhooks", "id": "193",
  "signature": { "algo": "HS256", "secret": "test_secret", "type": "jwt" } }
```

A call event subscription's response embeds the full `webhook` object it delivers to, so the same
secret leaks a second way one level deeper.

**Every action that touches one of these entities strips `signature.secret`** before returning
(`stripSignatureSecret` / `stripSignatureSecretFromPage` in [`lib/client.ts`](lib/client.ts)).
`algo` and `type` are harmless metadata and are kept — only the secret string is dropped. The value
remains visible to an admin in the Dialpad console. The invariant is enforced rather than
remembered: a test in [`tests/index.test.ts`](tests/index.test.ts) derives, from every action's own
source, the set of actions that request a secret-bearing path *and* parse a JSON body back, and
asserts it is exactly the set that calls `stripSignatureSecret`.

### 2. A 401 does not distinguish "no key" from "wrong key"

Measured live on 2026-08-29: an entirely absent `Authorization` header and a
syntactically-plausible-but-wrong bearer token produce the **byte-identical** body —

```json
{ "error": { "code": 401, "message": "A valid API key must be provided.",
             "errors": [{ "domain": "global", "reason": "required", "message": "..." }] } }
```

There is no separate code (like Apify's `token-not-provided` vs `user-or-token-not-found`) to tell
the two cases apart. `auth/api-key.ts`'s `test` hook says so in its failure message rather than
guessing which one happened.

### 3. Some actions need a company-admin key, and the credential probe must not be one of them

The spec tags several endpoints `x-access: admin` — `GET /api/v2/company` among them, whose own
description adds "Requires a company admin API key." A key minted for one specific user does not
reach it. This app's Auth `test` hook therefore probes `GET /api/v2/offices` instead (tagged
`x-access: user`, reachable by both key types, and its `OfficeProto` response carries nothing
secret) — see **Auth** below. `company-get` still exists as an action, refused for a user-level key
with an ordinary `403` rather than the Connection being reported broken, the same "a scoped
credential is a supported configuration" posture the pack applies to Apify's scoped tokens.

## Auth

One method: `api-key`, type `bearer`.

The vendor's own "Authentication" section: "All requests are authenticated via an API key in the
query parameter or as a bearer token in the Authorization header." This app only ever uses the
header — a query parameter puts the key in server logs and browser history, the same reasoning the
pack already applies to Apify's `?token=` form.

Dialpad also documents a full OAuth2 authorization-code flow (`GET /oauth2/authorize`,
`POST /oauth2/token`, `POST /oauth2/deauthorize`), which exists so **one** registered Dialpad
Marketplace app can serve many companies without each admin hand-copying a key. That flow needs a
`client_id`/`client_secret` pair registered with Dialpad ahead of time, which this Auth method
cannot satisfy generically — both paths end at the same `Authorization: Bearer` header, so nothing
is lost for a single-company connection: paste the static key from Admin Settings > Integrations >
API. A dedicated `oauth2` Auth method would be a reasonable follow-up if this app is ever registered
as a Marketplace app.

### The probe is `GET /api/v2/offices`, chosen by reading the spec's own access tags

| Candidate | `x-access` | Leaks anything? |
| --- | --- | --- |
| **`/offices`** | `user` — both key types | ✅ nothing but name, hours, phone numbers, e911 address |
| `/company` | `admin` only | would report a good user-level Connection as broken |
| `/users` | `user` | ✅ but returns a page of other people's PII on failure paths, more than a probe needs |

A user-level API key is scoped to one user ("'me' can be used if you are using a user level API
key" — `users.update`'s own docs); a company-admin key reaches everything, including the several
`x-access: admin` actions this app declares (`company-get`, `users-create`, `users-delete`, and any
call router / room / webhook action, per the vendor's admin-only guidance for those resources).

## Actions

35 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `call-list` | search | `GET /api/v2/call` |
| `call-get` | read | `GET /api/v2/call/{id}` |
| `call-initiate` | perform | `POST /api/v2/call` |
| `call-hangup` | perform | `PUT /api/v2/call/{id}/actions/hangup` |
| `call-transfer` | perform | `POST /api/v2/call/{id}/transfer` |
| `users-list` | search | `GET /api/v2/users` |
| `users-get` | read | `GET /api/v2/users/{id}` |
| `users-create` | perform | `POST /api/v2/users` |
| `users-update` | perform | `PATCH /api/v2/users/{id}` |
| `users-delete` | perform | `DELETE /api/v2/users/{id}` |
| `sms-send` | perform | `POST /api/v2/sms` |
| `contacts-list` | search | `GET /api/v2/contacts` |
| `contacts-get` | read | `GET /api/v2/contacts/{id}` |
| `contacts-create` | perform | `POST /api/v2/contacts` |
| `contacts-update` | perform | `PATCH /api/v2/contacts/{id}` |
| `contacts-delete` | perform | `DELETE /api/v2/contacts/{id}` |
| `callrouters-list` | search | `GET /api/v2/callrouters` |
| `callrouters-get` | read | `GET /api/v2/callrouters/{id}` |
| `callrouters-create` | perform | `POST /api/v2/callrouters` |
| `callrouters-update` | perform | `PATCH /api/v2/callrouters/{id}` |
| `callrouters-delete` | perform | `DELETE /api/v2/callrouters/{id}` |
| `rooms-list` | search | `GET /api/v2/rooms` |
| `rooms-get` | read | `GET /api/v2/rooms/{id}` |
| `rooms-create` | perform | `POST /api/v2/rooms` |
| `rooms-update` | perform | `PATCH /api/v2/rooms/{id}` |
| `rooms-delete` | perform | `DELETE /api/v2/rooms/{id}` |
| `webhooks-list` | search | `GET /api/v2/webhooks` |
| `webhooks-create` | perform | `POST /api/v2/webhooks` |
| `webhooks-get` | read | `GET /api/v2/webhooks/{id}` |
| `webhooks-update` | perform | `PATCH /api/v2/webhooks/{id}` |
| `webhooks-delete` | perform | `DELETE /api/v2/webhooks/{id}` |
| `call-event-subscription-list` | search | `GET /api/v2/subscriptions/call` |
| `call-event-subscription-create` | perform | `POST /api/v2/subscriptions/call` |
| `company-get` | read | `GET /api/v2/company` |
| `offices-list` | search | `GET /api/v2/offices` |

### Idempotency

**No endpoint in this app's covered surface documents an idempotency key.** Every `create`, `ring`,
`transfer` and `send` action is therefore `idempotent: false`: `call-initiate`, `call-transfer`,
`sms-send`, `users-create`, `contacts-create`, `callrouters-create`, `rooms-create`,
`webhooks-create`, `call-event-subscription-create`. (The one exception in the wider Dialpad API is
`message/schedule`'s own idempotency-key support — out of scope here, see below.)

Every `PATCH` that replaces the fields it names wholesale, and every `delete`, is `idempotent: true`:
`users-update`/`-delete`, `contacts-update`/`-delete`, `callrouters-update`/`-delete`,
`rooms-update`/`-delete`, `webhooks-update`/`-delete`. **`call-hangup` is the one deliberate
exception** — the vendor documents no "already ended" success case, so a retry against a call that
already hung up is expected to fail rather than silently no-op, and it stays `false` on that
conservative reading.

### Notes on individual actions

- **`call-list` only ever returns concluded calls.** The vendor's own note: a call in progress will
  not appear until it ends. Scope defaults to the credential — a user-level key sees its own calls, a
  company-level key sees everyone's — narrowed by `targetId`/`targetType`.
- **`call-initiate` is "Initiate via Ring", the real server-side call-origination endpoint** — it
  rings the calling user's already-registered device(s) (a Dialpad app, a CTI app, or a deskphone).
  There is no way to place a call without a device to ring; an entirely device-less API key cannot
  originate audio, only start the ringing that connects one.
- **`call-transfer` covers all four of the vendor's destination shapes** (phone number, target,
  existing call, or a specific operator on a target) behind one "Destination type" select, since
  exactly one is ever sent per call.
- **`sms-send` requires exactly one recipient form and one content form**, checked before any
  request is made: `toNumbers` or `channelHashtag`, and `text` or `media`.
- **`contacts-list`/`-create` can target a *local* contact instead of a shared one** via
  `ownerId`/`owner_id` — the vendor's own distinction, not a param this app invented.
- **`callrouters-create`/`-update` accept a `secret`** the caller may supply (minimum 32 characters,
  per the vendor's docs) or leave empty to let Dialpad generate one; either way the response is
  redacted before this app returns it.
- **`callrouters-update`'s `resetErrorCount` matters more than it looks.** A router auto-disables
  after 10 routing errors within an hour, and setting `enabled: true` does **not** reset that
  counter — the vendor's own note says a router "fixed" without also resetting the count will likely
  disable itself again after one more error.
- **`callrouters-delete` is the one delete in this app whose 200 response carries no body** —
  confirmed by reading the OpenAPI `responses` block, not assumed. Every other delete here returns
  the deleted entity; this one is status-only.
- **`rooms-update`/`users-update`'s list fields (`phoneNumbers`, `emails`, `forwardingNumbers`)
  replace the full list**, per the vendor's own wording — remove an entry by leaving it out, not by
  sending a "delete" flag.
- **`webhooks-create` is the delivery destination; `call-event-subscription-create` is the
  subscription.** A webhook id can back several subscriptions. Deleting a webhook a subscription
  still names leaves that subscription pointing at nothing.
- **`company-get` needs a company-admin key** (`x-access: admin`) — see Auth above for why it is not
  the health probe.
- **`offices-list` exists because three other actions need an office id** (`users-create`,
  `rooms-create`, `callrouters-create`) and there is no other way to look one up.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path — is this a catch-all?** No.

| Path | Status | Bytes |
| --- | --- | --- |
| `/api/v2/summary.json` | 200 | 6,538 |
| `/api/v2/status.json` | 200 | 231 |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** |

**(b) Content-type and body.** `application/json; charset=utf-8`, parsing as the Statuspage v2
schema — 6,538 B of structured JSON, not the ~127,700 B of HTML an unclaimed `*.statuspage.io` page
serves.

**(c) Does the page describe *this* product?** Yes — `"page": {"id": "80trk830s0hg", "name":
"Dialpad", "url": "https://status.dialpad.com"}`, with 18 components that are Dialpad's own:
Telephony Infrastructure (Inbound/Outbound Calls), Carrier Networks (Local Numbers, Toll-Free
Numbers, Messaging), Application, Contact Center, Omnichannel, Meetings, Analytics, **API Platform**,
Integrations, Messaging, Website, Dialpad Ai, Google Cloud Platform, Ai Agent, Workforce Management.

**No component groups** — unlike some other Statuspage instances (Apify's, for example), every
component here has `group: false` and `group_id: null`. The mapping still checks for `group: true`
defensively, in case the page is restructured later, but nothing in the current page needs that
filter.

Severity is left at the `degraded` default: Dialpad is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### ~~`quota`~~ — a declared absence, at `informational` severity

Dialpad is billed by seat/license, not metered API spend: there is no `/limits` or `/usage`
endpoint anywhere in the OpenAPI document, and `company.get`'s own response (`account_type`,
`state`, `office_count`) carries plan tier and enablement, never a consumption figure.

What **does** exist is a fixed, per-endpoint rate limit stated in each operation's own description
(`x-ratelimit`) — 1200/minute for most writes, 20/minute for `company.get`/`users.list`, 5/minute for
`call.initiate`. Live probes on 2026-08-29 (both a 401 and a 200 response) carried **no**
`X-RateLimit-*`, `RateLimit-*` or any other rate-limit header at all — the ceilings are documented in
prose, not exposed on the wire, so there is nothing here to read into a headroom reading.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, which
outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict at `unknown`
forever.

## Deliberately not covered

Dialpad's Admin API v2 declares roughly 150 documented paths (244 operations). This app covers 35,
chosen for the calls / users / SMS / contacts / call-routing / rooms / webhooks surface the task
asked for. What is left out, and why:

- **SMS list/history — there is no such endpoint.** The `sms` tag declares exactly one operation,
  `sms.send`. What the API *does* expose beyond sending are two adjacent, different features: **bulk
  SMS** (`message/bulk` — a CSV-driven batch send, with its own list/get/update) and **scheduled
  SMS** (`message/schedule` — a message queued for a future time, the one endpoint in this whole API
  that documents an idempotency key). Neither is "list the SMS I've sent"; both are left out for
  scope, not because they could not be confirmed.
- **Contact centers, dispositions, scorecards, coaching teams, workforce management (`wfm`)** — a
  large, genuinely separate contact-center-supervisor surface (agent duty status, skill levels,
  QA scorecards, schedule adherence). Left out for scope; a natural follow-up if contact-center
  workflows are ever prioritized.
- **Custom IVRs, departments, offices' own CRUD (create/update/delete), access control policies,
  blocked numbers, coaching teams, e911 addresses, fax/faxline, meetings/conference rooms, number
  management (assign/unassign/swap/format), scheduled reports, transcripts, user devices,
  websockets, digital sessions, agent groups, channels** — all real, all documented, all left out for
  scope. `offices-list` (read-only) is the one office action included, because three other actions
  need an office id to work at all.
- **OAuth2** (`/oauth2/authorize`, `/oauth2/token`, `/oauth2/deauthorize`) — see Auth above for why a
  single Bearer API key covers this app's needs without it.
- **The sandbox host** (`sandbox.dialpad.com`) — a second, separate test company the OpenAPI document
  declares as an alternate server. Live-probed and confirmed to answer the same `401` shape as
  production, but this app only ever builds requests against `dialpad.com`.
- **The `?token=` query-parameter auth form** — works, and is deliberately unreachable. See Auth.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's own OpenAPI document and was read there.

## Icon

`assets/icon.svg` wraps `https://dialpad.com/assets/images/favicons/favicon-192x192.png`,
downloaded verbatim on 2026-08-29 — 33,397 bytes, `image/svg+xml` container around a base64
`image/png`, the exact file dialpad.com's own `<link rel="apple-touch-icon" sizes="192x192">` tag
points at. Dialpad publishes no SVG mark on its own site (only PNG favicons at several sizes, plus an
`.ico`), so this follows the pack's existing precedent for that case — wrapping the vendor's own
raster asset in an `<svg><image>` container rather than hand-tracing a vector that does not exist
(see `apollo`, `blandai`, `gorgias`, `kustomer`). It is not run through `_tools/icon-normalize.ts`,
matching those apps: that tool re-frames genuine vector artwork onto the pack's shared 100×100
canvas, and a wrapped raster already fills its own square.

## Layout

```
dialpad/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # DialpadClient, error formatting, signature-secret redaction
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-key.ts              # bearer API key: sign, test
├── actions/                     # one file per action (35)
├── health/
│   ├── service.ts                # status.dialpad.com
│   └── quota.ts                  # declared absence, informational
├── assets/icon.svg              # vendor's own PNG favicon, wrapped as SVG
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly. Without it, `_tools/audit.ts` picks up
`_tools/deno.json` as its configuration and cannot resolve the `@w6w/types` **value** import in
`health/service.ts` (`worstHealthState`); this reproduces identically for the sibling `apify` and
`paddle` apps, so it is a property of how the tool is invoked, not of this app.
