# Brex

Corporate card and spend management, over the **Brex Team API v1.0**.

This app covers the directory and card surface a spend workflow runs on: users,
the departments, locations and titles they report into, legal entities, the
company behind the credential, and the cards themselves — listed, read,
re-limited, locked, unlocked and terminated.

- **23 actions**, all against `https://api.brex.com/v2`.
- **One auth method**: a Brex **user token**, sent as `Authorization: Bearer <token>`.
- **Health checks**: Brex's own status page, anchored on its `Partner API`
  component; quota headroom declared absent, because Brex publishes no readable
  counter.

Every path, verb, query parameter, body field and enum here was verified on
**2026-09-22** against Brex's own machine-readable OpenAPI bundle
(`developer.brex.com/openapi/team_api.md` plus the per-endpoint pages it links)
and against live probes of `api.brex.com` and `status.brex.com`. Nothing came
from a third-party integration directory.

## Connecting

1. Sign in to the Brex dashboard as an account admin or card admin.
2. Go to **Settings → Developer** and accept the developer API agreement if
   prompted.
3. **Create Token**, choose the scopes the workflows using this connection need,
   then **Allow Access**.
4. Copy the token — it is shown once and starts with `bxt_` — and paste it into
   the connection's **User token** field.

Brex's own authentication guide describes exactly this: "To start making calls
to Brex APIs, generate a user token from your Brex dashboard and pass it along
in your API call headers."

A token expires after **90 days of no use**, or if the user it belongs to goes
non-active. The connection check reports both, because Brex distinguishes them in
the response body rather than in the status code (see below).

### Why the partner OAuth2 flow is not built

Brex documents **two** authentication stories. The second is a partner
authorization-code flow with refresh tokens, for ISVs taking many customer
accounts through a consent screen.

This app ships the static user token only, and that is a scope decision rather
than a research gap — the same narrowing this pack already made for
[Base44](../base44/README.md) and [Devin](../devin/README.md):

- The partner flow needs a **registered OAuth application**, a **redirect URI**
  and a **live per-customer authorization step** in a browser. None of those can
  be performed by an app in a headless sandbox, and none of them can be
  exercised by this pack's test harness.
- The static token reaches a real, useful subset of the same API. Every one of
  the 23 actions here works with it.
- The OpenAPI document labels the token scheme "OAuth2", because the token
  carries OAuth-style scopes — but nothing about obtaining it is interactive, so
  the app declares `type: "bearer"`. No `oauth2` block, no authorization URL and
  no refresh hook ships anywhere in this package.

If a multi-tenant partner integration is wanted later, that is a second auth
method on the same actions, not a rewrite of them.

## Actions

`Idempotency-Key` is optional on every `POST`/`PUT` below. Where an action
exposes it, the value is forwarded **verbatim as the header** — this app never
invents one, so a retry with no key acts again. Pass the same key on a retry to
get Brex's own deduplication.

### Users

| Action | Endpoint | Type |
| --- | --- | --- |
| List Users | `GET /v2/users` | search |
| Invite User | `POST /v2/users` | perform, not idempotent |
| Get Current User | `GET /v2/users/me` | read |
| Get User | `GET /v2/users/{id}` | read |
| Update User | `PUT /v2/users/{id}` | perform, idempotent |

**List Users** exposes both families of filters Brex documents, and they do not
mix. The plural ones — `email[]`, `status[]`, `manager_id[]`, `department_id[]`,
`location_id[]`, `title_id[]`, `cost_center_id[]`, `legal_entity_id[]`,
`custom_field[]` — are sent as one comma-separated value each, which Brex states
is equivalent to repeating the parameter. The **legacy singular** `email` and
`remote_display_id` are exact lookups that return at most one user and "cannot be
combined with the filters above"; both are labelled in the form, because
combining them fails silently rather than erroring. `name` is a fuzzy,
case-insensitive match against first name, last name **and** email. Archived
users are excluded unless `ARCHIVED` is selected.

**Update User** accepts only `ACTIVE` and `DISABLED` for `status` — the narrower
write enum, not the six-value list filter — and `legal_entity_id` cannot be
cleared once set, because Brex marks that one field non-nullable.

### Locations, Departments, Titles

| Action | Endpoint | Type |
| --- | --- | --- |
| List Locations | `GET /v2/locations` | search |
| Create Location | `POST /v2/locations` | perform, not idempotent |
| Get Location | `GET /v2/locations/{id}` | read |
| List Departments | `GET /v2/departments` | search |
| Create Department | `POST /v2/departments` | perform, not idempotent |
| Get Department | `GET /v2/departments/{id}` | read |
| List Titles | `GET /v2/titles` | search |
| Create Title | `POST /v2/titles` | perform, not idempotent |
| Get Title | `GET /v2/titles/{id}` | read |

All three lists take `name`, `limit` and `cursor`. A location and a department
each carry an optional `description`; **a title has only a name**, which is
Brex's shape rather than a field this app dropped.

### Cards

| Action | Endpoint | Type |
| --- | --- | --- |
| List Cards | `GET /v2/cards` | search |
| Get Card | `GET /v2/cards/{id}` | read |
| Update Card | `PUT /v2/cards/{id}` | perform, idempotent |
| Lock Card | `POST /v2/cards/{id}/lock` | perform, idempotent |
| Unlock Card | `POST /v2/cards/{id}/unlock` | perform, idempotent |
| Terminate Card | `POST /v2/cards/{id}/terminate` | perform, idempotent |

Notes that matter in practice:

- **Only `limit_type = CARD` cards have `spend_controls`.** Corporate cards
  (`limit_type = USER`) inherit the user's limit, so `spend_controls` is
  legitimately absent on most cards — the API's shape, passed through as it
  arrived.
- **Update Card is for vendor cards**, which is Brex's own wording for a card
  whose limit lives on the card. Money is in the currency's smallest unit:
  `spend_controls.spend_limit.amount` of `500000` USD is **$5,000.00**, not
  $500,000.
- **The merchant lists are mutually exclusive**, and each accepts at most 50
  entries. Both rules are enforced locally, before a request is sent, rather than
  passed on as a vendor `400`.
- **Lock and terminate require a `reason`** from a fixed seven-value enum, and
  Brex notifies the card owner. Lock is reversible with Unlock; `TERMINATED` is
  terminal — nothing in this API restores or unlocks a terminated card.
- **Unlock sends no request body**, because Brex documents none. The client only
  sets `content-type` when it has something to serialize.

### Legal Entities and Company

| Action | Endpoint | Type |
| --- | --- | --- |
| List Legal Entities | `GET /v2/legal_entities` | search |
| Get Legal Entity | `GET /v2/legal_entities/{id}` | read |
| Get Company | `GET /v2/company` | read |

These two resources are the reason this app does **not** normalize field names:

- a legal entity returns `displayName`, `billingAddress`, `createdAt`,
  `isDefault` (camelCase);
- a company returns `legal_name` and `mailing_address` (snake_case) alongside
  `accountType` (camelCase);
- users, locations, departments and cards are snake_case throughout.

Passing each through verbatim means a field name in a workflow result is the
field name in Brex's docs. `company-get` is also how a workflow reads
`accountType` — `BREX_CLASSIC` or `BREX_EMPOWER` — before running something that
may be gated on Empower accounts.

## Not covered

Scope is the **Team API v1.0 only**. Three endpoints within its Cards resource are
deliberately not implemented, and each for a reason rather than a gap:

- **`POST /v2/cards` (create card).** Brex gates it behind budget management on
  Empower accounts — "If your account does not have access to budget management
  features, a 403 response status will be returned" — and a physical card needs a
  full mailing address plus spend controls in the same call. A general-purpose
  action would fail for many tenants, so it is left out rather than shipped as a
  mostly-403.
- **`GET /v2/cards/{id}/pan` (get card number).** Returns the raw PAN, CVV and
  expiration date. Raw card numbers have no business crossing a workflow engine
  or landing in a run record.
- **`POST /v2/cards/{id}/secure_email`.** Transmits the same raw PAN and CVV, and
  Brex gates it outright: "This endpoint is currently gated. If you would like to
  request access, please reach out to developer-support@brex.com."

Brex also publishes Accounting, Budgets, Expenses, Fields, Onboarding, Payments,
Transactions, Travel and Webhooks OpenAPI documents. None of them are in this
build; they are separate APIs with separate scopes, and mixing them into a
"Brex" app would make the connection's scope requirements unreadable.

## Health checks

| Check | Kind | What it answers |
| --- | --- | --- |
| `service` | service | Is the Brex developer API up? |
| `quota` | quota | Declared absent — Brex publishes no readable headroom |
| `auth:api-token` | credential | Is this token live? (derived from the auth `test` hook) |

### `service` — anchored on `Partner API`, `informational`

`https://status.brex.com` is a real Atlassian Statuspage. Read 2026-09-22:
`GET /api/v2/summary.json` → `200`, `page.name` = `"Brex"`, `page.url` =
`https://status.brex.com`, 11 components and no groups:

```
Partner API, Money movement: card authorization, Dashboard, Mobile,
Spend Management, Authentication, Partner Integrations, Brex Travel,
Bill Pay, Home Page, Banking
```

**Every call this app makes goes to the developer API, which is the `Partner API`
component.** A Dashboard, Mobile or Brex Travel incident that leaves the API
healthy is not this app's problem, so the verdict is that component alone and the
other ten are reported as `components` detail rather than rolled into the answer.
The component is matched by **anchored name**, not by its id (`mjm37m197f3v` when
read): ids change when a component is recreated, and this app should not have to
be redeployed when they do. If the component ever disappears the check reports
`unknown` and says so, instead of substituting the page-wide roll-up.

Severity is `informational`: a vendor incident is evidence, not a verdict on a
given workflow, and "Partner API degraded" does not say which of the 23 actions
above is affected. The check is unsigned (`credential: "none"`) and reaches
`status.brex.com` through its own per-hook allowlist — the status host is never
added to the app's `network.allow`, and a status host never sees a Brex token.

### `quota` — declared absent, `informational`

Brex's rate-limit guide documents the ceilings in prose: per Client ID and Brex
account, **1,000 requests / 60 seconds**, 1,000 transfers / 24 hours, 100
international wires / 24 hours, and 5,000 cards created / 24 hours. Exceeding one
answers `429`, and the documented remedy is client-side exponential backoff — a
client behaviour, not something a check can read.

There is no readable counter anywhere. Two live responses from `api.brex.com`
(read 2026-09-22 — an unauthenticated `GET /v2/users/me` and the same call with a
bad token) carried **no `X-RateLimit-*`, `RateLimit-*` or `Retry-After` header of
any kind**, and no Team API endpoint reports one. So this is a declared
**absence** with a reason, at `severity: "informational"` — the severity is
load-bearing, because an `unavailable` entry always reports `unknown` and at any
other severity it would pin the app's verdict there forever.

### The credential probe, and why it reads the body

`auth/api-token.ts` probes `GET /v2/users/me`, which is also the
`user-get-current` action. It is the right probe because it needs no scope beyond
holding a token, it returns no token, key or secret field at all, and it is the
endpoint Brex's own quickstart calls first. The path and the query builder are
shared through `lib/client.ts`, so the two call sites cannot drift — the only
difference is that the auth hook holds the credential and stamps the header
itself, while the action sends none and is signed by the runtime.

**Classification reads the response body, never the bare status code.** `403` is
overloaded on this API:

| What was measured / documented | Reported as |
| --- | --- |
| `403 {"type":"FORBIDDEN","message":"Invalid or Revoked Token"}` (live, 2026-09-22) | token rejected — generate a new one |
| `401 {"type":"UNAUTHORIZED","message":"PERMISSION_DENIED: Invalid or Revoked Token"}` (docs) | token rejected |
| `403` "Expired token" (docs' error table) | token rejected |
| `401` with a **empty body** (live; what Brex answers when no credential arrives) | the credential never reached the request |
| `403` with a body that is not about the token | a refusal — check the token's scopes and the user's state |

The probe's own response never echoes the credential back, and
`afterConnect` publishes the user's **email only** — the whoami also returns an
id, name, status, department/location/title/cost-centre references, metadata and
custom fields, none of which belong in a Connection label.

## Development

```
deno task test       # 167 unit tests, mocked HookContext
deno task check      # type-check every module and test
deno task lint
deno task fmt        # NOTE: the task, not bare `deno fmt`
deno task validate   # the pack's manifest/sandbox auditor
```

Use `deno task fmt`, not bare `deno fmt`: the bare form walks `assets/` too and
will re-encode `icon.png`, which is the vendor's artwork saved verbatim.

### Layout

```
apps/brex/
├── index.ts              # { actions, auth, healthChecks }
├── lib/client.ts         # BrexClient, query serialization, error formatting, entity types
├── lib/params.ts         # shared params and the vendor's enums
├── auth/api-token.ts     # bearer sign/test/afterConnect, and the probe's reasoning
├── actions/*.ts          # one file per action, 23 in all
├── health/service.ts     # status.brex.com, anchored on `Partner API`
├── health/quota.ts       # declared absence
├── assets/icon.png       # the vendor's real mark, verbatim
└── tests/                # index, client, auth, health and one file per action
```

The mark in `assets/icon.png` is Brex's own (`www.brex.com/apple-touch-icon.png`,
a 256×256 PNG), saved verbatim and declared as `appearance.icon.url` because
`www.brex.com/favicon.svg` is a 404 — there is no SVG to declare and none was
invented.
