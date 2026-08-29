# Whop

Manage Whop memberships, products, plans, payments, promo codes and webhooks, on the **Whop REST
API v1**.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 35
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.whop.com` (the `service` check adds `status.whop.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://whop.com/
- **API docs** — https://docs.whop.com/developer/api/getting-started
- **Status page** — https://status.whop.com/

Whop is a creator-commerce platform: sellers list **Products**, price them with **Plans**, and
buyers hold **Memberships** that track billing state, the current period, and access. A **Member**
is one buyer's relationship with an account regardless of how many Memberships they hold. This
app covers that operational path plus **Payments** (read/refund), **Promo Codes**, and **Webhooks**.

> **Everything below was verified against Whop's own sources on 2026-08-29** — `docs.whop.com`,
> read as markdown via its `llms.txt`/`llms-full.txt` index and the per-endpoint OpenAPI 3.1
> fragments each reference page embeds — plus live probes against `api.whop.com` and
> `status.whop.com`. Nothing here came from a third-party integration directory.

## The five things most likely to go wrong

### 1. An unpinned request silently gets the pre-2025 API

The Whop API is versioned by date. Whop's own words: "If you don't pass an `Api-Version-Date` or
have a stored API-key pin, the stable API model is used" — the *original*, `2025-01-01` behavior.

This is not a cosmetic default. Every native resource this app touches — Memberships, Members,
Products, Plans, Promo Codes, Webhooks — was migrated between 2026-06-08 and 2026-08-03 from a
`company_id` request-body/query model to `account_id`. **Measured live 2026-08-29:**

| Request | Result |
| --- | --- |
| `GET /products?first=1`, no `Api-Version-Date` | `400 {"error":{"type":"invalid_request_error","message":"Missing required parameter: company_id."}}` |
| Same call, `Api-Version-Date: 2026-08-25-2` | Works — expects `account_id`, not `company_id` |

An app that built requests against the current docs but forgot the header would get a `400` that
looks like a bug in the app rather than a missing header. Every request this app sends pins
[`API_VERSION_DATE`](lib/client.ts) (currently `2026-08-25-2`, the newest version confirmed live).

### 2. Payments is the one resource that was never migrated

The **Payments** actions (`payment-list`, `payment-get`, `payment-refund`) call `/payments`, which
— as of 2026-08-29 — has **not** been migrated to the `account_id` model every other list action
here uses. It still takes `company_id`, confirmed two ways:

- The vendor's own **Legacy** reference page for `/payments` documents `company_id`.
- Whop's getting-started guide's *only* worked `curl` example against this whole API is
  `GET /payments?company_id=biz_...`.

The versioned "Payments" tag under `/api-reference/beta` adds three *different* endpoints —
`capture`, `retrieve status`, `update return_url` — for the confirmation-token checkout flow, and
none of them list, read, or refund an existing payment. Sending `Api-Version-Date` alongside a
`/payments` call is harmless, but it does not turn `company_id` into `account_id` here.

A second, smaller Legacy quirk: its OpenAPI fragment declares array filters (`product_ids`,
`plan_ids`, `statuses`, `currencies`) `style: form, explode: true` — the plain OpenAPI 3 default,
`key=a&key=b` with **no brackets** — while every native resource's own docs specify the opposite
by example (memberships: "Repeat as `product_ids[]` for several"). [`lib/client.ts`](lib/client.ts)
supports both (`arrayStyle: "bracket" | "repeat"`), and `payment-list.ts` is the one caller that
opts into `"repeat"`.

### 3. The auth probe is `/permissions`, not the obvious `/users/me`

Two endpoints were measured live on 2026-08-29 before picking one:

| Candidate | Missing token | Fake token | Works for an App API key? |
| --- | --- | --- | --- |
| `GET /users/me` | `404 {"error":{"type":"not_found","message":"User not found"}}` | **Identical** `404` | Uncertain — "the authenticated user" is a session/OAuth-token concept, and an App API key authenticates as the app, not a person |
| `GET /permissions?resource_id=...` | `401 {"error":{"type":"unauthorized","message":"Authentication failed"}}` | **Same** `401` | Documented to "answer for whichever identity authenticated the request — a user session, an OAuth token, or an account or app API key" |

`/users/me` cannot tell "no credential" from "bad credential" apart — both produce a bare 404 — and
might report a working App API key connection as broken. `/permissions` distinguishes them cleanly
and needs no scope of its own ("it answers only your own access"), and its response — a list of
`{action, granted}` booleans — carries nothing credential-shaped even if this hook read it, which
it never does on success. See [`auth/api-key.ts`](auth/api-key.ts) for the full reasoning, including
why a non-`401` failure is reported as ambiguous between the key and the `accountId` field rather
than as a rejected credential.

### 4. Two secrets returned by two different actions, two different rules

- **`POST /webhooks`** returns a live `webhook_secret` — "returned on the create response ... `null`
  for API-key and OAuth callers on later reads." The workflow genuinely needs this value downstream
  (to verify inbound deliveries), so `webhook-create.ts` **keeps** it, with a loud warning in its own
  description to treat the output as sensitive.
- **A Payment's `client_secret`** is "the credential the buyer's surface presents to poll this
  payment ... treat it like a password for that one attempt" — meant for the *buyer's* client-side
  checkout flow. Reading a payment for reporting or reconciliation has no legitimate use for it, so
  `payment-get.ts`, `payment-list.ts`, and `payment-refund.ts` all strip it via
  [`stripPaymentSecret`](lib/client.ts) before returning, the same discipline this pack applies to
  any other incidental credential surfaced by an otherwise ordinary read.

The invariant is enforced, not just remembered: a test in [`tests/index.test.ts`](tests/index.test.ts)
derives, from every action's own source, the set that touches a `/payments` path and asserts it is
exactly the set that calls `stripPaymentSecret` — currently 3 (list, get, refund) — and a second
test pins that `webhook-create` is deliberately *not* in that set.

### 5. `amount_off`'s unit flips between write and read

Creating a percentage promo code takes a **whole number** — the create endpoint's own example is
`amount_off: 25` for 25% off. Reading that same code back reports it as a **decimal fraction** per
the PromoCode entity schema's own words: "Percentage discounts are represented as a decimal
fraction," example `amount_off: 0.25`. Both are Whop's own documented examples for the identical
field on the identical concept. `promo-code-create.ts`'s `amountOff` param states both units in its
hint so a workflow author does not read a percentage code back and see what looks like a broken
100x discount.

## Auth

One method: `api-key`, type `bearer`.

Whop issues two kinds of API key and this method accepts either without asking which: an
**Account API key** ("access ... your own Account and connected accounts") or an **App API key**
("access data on accounts that have installed your app"). Both are sent identically —
`Authorization: Bearer <key>`.

Two fields are collected: `apiKey` (secret) and `accountId` (a `biz_...` tag, plain string). The
second exists because an App API key has no single implicit account — several list endpoints
(`GET /webhooks`, `GET /promo_codes`) *require* an explicit `account_id` with no default — and
because the credential-test probe needs a `resource_id` to check against. `afterConnect` echoes
`accountId` (never `apiKey`) into the connection's non-secret display metadata, so any action can
default to `ctx.connection?.display?.accountId` instead of forcing every call to repeat it
([`lib/client.ts`](lib/client.ts)'s `resolveAccountId`/`requireAccountId`).

Whop's OAuth surface is deliberately not modeled as a second Auth method here: it authenticates a
signed-in **user** ("Sign in with Whop", embedded chat), a fundamentally different credential shape
from the account/app-scoped key this app's catalog-and-membership-management actions need.

## Actions

35 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `membership-list` | search | `GET /memberships` |
| `membership-get` | read | `GET /memberships/{id}` |
| `membership-update` | perform | `PATCH /memberships/{id}` |
| `membership-cancel` | perform | `POST /memberships/{id}/cancel` |
| `membership-pause` | perform | `POST /memberships/{id}/pause` |
| `membership-resume` | perform | `POST /memberships/{id}/resume` |
| `membership-extend` | perform | `POST /memberships/{id}/extend` |
| `member-list` | search | `GET /members` |
| `member-get` | read | `GET /members/{id}` |
| `product-list` | search | `GET /products` |
| `product-get` | read | `GET /products/{id}` (public) |
| `product-create` | perform | `POST /products` |
| `product-update` | perform | `PATCH /products/{id}` |
| `product-delete` | perform | `DELETE /products/{id}` |
| `plan-list` | search | `GET /plans` |
| `plan-get` | read | `GET /plans/{id}` (public) |
| `plan-create` | perform | `POST /plans` |
| `plan-update` | perform | `PATCH /plans/{id}` |
| `plan-delete` | perform | `DELETE /plans/{id}` |
| `promo-code-list` | search | `GET /promo_codes` |
| `promo-code-get` | read | `GET /promo_codes/{id}` |
| `promo-code-create` | perform | `POST /promo_codes` |
| `promo-code-delete` | perform | `DELETE /promo_codes/{id}` |
| `promo-code-activate` | perform | `POST /promo_codes/{id}/activate` |
| `promo-code-deactivate` | perform | `POST /promo_codes/{id}/deactivate` |
| `webhook-list` | search | `GET /webhooks` |
| `webhook-get` | read | `GET /webhooks/{id}` |
| `webhook-create` | perform | `POST /webhooks` |
| `webhook-update` | perform | `PATCH /webhooks/{id}` |
| `webhook-delete` | perform | `DELETE /webhooks/{id}` |
| `payment-list` | search | `GET /payments` (Legacy — `company_id`) |
| `payment-get` | read | `GET /payments/{id}` (Legacy) |
| `payment-refund` | perform | `POST /payments/{id}/refund` (Legacy) |
| `user-get` | read | `GET /users/{id}` |
| `user-check-access` | read | `GET /users/{id}/access/{resource_id}` |

### Idempotency

Whop's own mechanism: "Every authenticated `POST` on the Whop API accepts an `Idempotency-Key`
header ... Retrying with the same key replays the stored response instead of executing the request
again" (a 24-hour window). Every `perform` action in this app sends `ctx.invocation.invocationId`
as that key via [`idempotencyHeaders`](lib/client.ts) — exactly the "same key = same operation"
identity the vendor asks for, and stable across a runtime's retry of one step. `PATCH`/`DELETE`
requests are documented as "safe to retry" without any key at all.

Because of this, **every `perform` action in this app is declared `idempotent: true`** — including
`membership-extend`, which adds free days each call by nature: without the header a retry would
double the days, but with it a retry of the *same* runtime step replays the original extension.
This is pinned by a test in `tests/index.test.ts` rather than left as an assumption.

### Notes on individual actions

- **`membership-cancel` vs `membership-update`'s `cancelAtPeriodEnd`.** Both can schedule a
  period-end cancellation. `membership-update` is the lighter-weight metadata/toggle path;
  `membership-cancel` is the dedicated lifecycle endpoint and is what a workflow reaching for "cancel
  this membership" should use — it also accepts a free-form `reason` and can revoke access
  immediately (the update path cannot).
- **`membership-cancel` can 409.** Buyers cannot cancel buy-now-pay-later (`splitit`, `sezzle`) or
  non-trial split-pay memberships; Whop reports that as a `409`, not a `400`.
- **`membership-pause`'s `until` only works for memberships billed by Whop itself.** Passing it for
  anything else is a documented `400`.
- **`product-get` and `plan-get` are public** (`requiresAuth: false`) — Whop serves both
  unauthenticated, and this app takes advantage of that rather than forcing a Connection for a read
  that does not need one.
- **`product-list`'s `useMarketplace` is a mode switch, not a narrowing.** Whop's own words: "Omit
  `account_id` to search the public marketplace." Every other list action here treats an omitted
  `accountId` as "use the connection's own account"; this one genuinely searches a different,
  public dataset instead, so the toggle is explicit rather than inferred from an empty field.
- **`plan-list` with `productIds` is also public**, and returns only visible, non-invoice plans for
  those products — `accountId` is dropped entirely in that mode, matching the vendor's own
  either/or design (`accountId` is "required unless `productIds` is provided").
- **`webhook-list` and `promo-code-list` require `accountId`**, with no vendor-side default to fall
  back to — unlike every other list action, which either defaults it server-side or treats it as an
  optional narrowing. Both still accept the connection's own `accountId` automatically; the
  distinction only matters when neither is set, in which case these two throw before making a
  request rather than sending a request Whop will reject anyway.
- **`user-get`'s `id: "me"` needs care.** See finding 3 — a fake or missing token both 404 rather
  than 401, and an App API key may not resolve "the authenticated user" at all. This action exposes
  `id: "me"` anyway because it is a real, documented form and is exactly why the auth probe does not
  use it.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

`status.whop.com` answers Statuspage-shaped JSON, but its own Atom feed's `<generator>` names
**incident.io** — which deliberately serves a Statuspage-API-compatible surface for migrators, so
shape alone proves nothing. Confirmed as Whop's own page instead:

- **Bogus sibling path.** `/api/v2/summary.json` → 200, 817 bytes, real components. A nonsense path
  → **404**, not a catch-all.
- **Self-identification.** `"page": {"name": "Whop", "url": "https://status.whop.com/"}`, and
  `/api/v2/incidents.json` names real, product-specific incidents (e.g. "Errors Claiming Discord
  Roles"), not placeholder text.
- **What the components mean.** Three: `Website`, `Android App`, `iOS App`. **None is named "API"**
  — this page does not promise anything about `api.whop.com` specifically, so the check trusts the
  page-level `status.indicator` (Whop's own roll-up), exactly as it would for a page with an
  explicit API component.

### ~~`quota`~~ — a declared absence, at `informational` severity

No readable request-rate headroom exists. Live `api.whop.com` responses — both a public success and
a rejected authenticated call — carried no `X-RateLimit-*` or `RateLimit-*` header of any kind.
Whop's own troubleshooting docs: "Whop limits authenticated API calls to 600 requests per minute per
operation and API credential," and the only signal ahead of a refusal is the `429` itself, whose
body carries a **human sentence** — `{"error":{"type":"rate_limit_exceeded","message":"Try again in
12 seconds."}}` — not a machine-readable reset field a health check could poll in advance.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, which
outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict at `unknown`
forever.

## Deliberately not covered

Whop's REST API surface is very large — accounts/team management, ads, bounties, cards/payouts,
disputes, resolution-center cases, exports, files/media, chat, and more. This app covers the
membership/commerce path the task scoped it to. Specifically left out, and why:

- **Plans/Products' `PublicFacing` marketplace-authoring fields** (labels, gallery images, checkout
  styling, custom fields) beyond the ones exposed — a full storefront-design surface, not workflow
  automation.
- **`POST /promo_codes`'s full currency enum** — the vendor documents ~90 codes (including a few
  non-ISO ones, `whop_usd`/`btc`/`eth`/`usdt`). `currencyParam` is a free-text field with a hint
  rather than a giant `select`; the vendor validates server-side regardless.
- **Webhook delivery inspection** (`GET /webhooks/{id}/deliveries`, replay, send-test-event) — useful
  for debugging a webhook, not for driving a workflow.
- **Confirmation Tokens, Setup Intents, and `POST /payments` (create)** — the confirmation-token
  checkout flow is inherently buyer-facing/client-side; a backend workflow automating memberships
  and payments reads and refunds existing payments rather than originating new ones through this
  flow. `payment-refund`/`payment-list`/`payment-get` cover the read/refund side.
- **`GET /payments/{id}/fees`** — delivery-fee breakdown, a reporting detail rather than an
  operational one; add it alongside a future receipts/reporting pass if needed.
- **Accounts, Team Members, API Keys** — account administration, not the membership/commerce
  surface this app targets.
- **OAuth** — see Auth above: a different credential shape (a signed-in user), not modeled as a
  second Auth method here.
- **Sandbox host** (`sandbox-api.whop.com`) — this app has no notion of a sandbox Connection; add it
  as a second Auth method or a per-Connection base-URL override if that becomes a real need.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's own reference and was read there.

## Icon

`assets/icon.svg` is Whop's own "W" glyph mark — three orange chevron paths, `#FA4616` — extracted
**verbatim** from the inline `<svg>` element whop.com's own header renders on 2026-08-29. The
vendor's `favicon.ico` is a raster ICO (PNG frames, not a vector), and `apple-icon.png`/the web
manifest's icons are raster PNGs too — no square vector app-icon glyph is published through any of
those channels, and `simple-icons`/n8n's `nodes-base` do not carry a Whop mark either. The header's
own combined wordmark SVG separates cleanly into a colored glyph group (this icon) followed by
plain-`currentcolor` "hop" lettering; only the glyph group's three paths were kept, re-framed onto
the pack's normalized `0 0 100 100` canvas by `_tools/icon-normalize.ts` — the path data and color
are untouched. A test in [`tests/index.test.ts`](tests/index.test.ts) pins one path's control points
and the brand color, so a redraw fails the suite.

## Layout

```
whop/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # WhopClient, versioning, idempotency, error formatting, redaction
│   └── params.ts                # shared Param fragments and option lists
├── auth/api-key.ts               # bearer key + accountId: sign, test, afterConnect
├── actions/                     # one file per action (35)
├── health/
│   ├── service.ts               # status.whop.com
│   └── quota.ts                 # declared absence, informational
├── assets/icon.svg              # vendor mark, extracted verbatim
└── tests/                       # 134 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` fails with an `@w6w/runtime` import-map error — this reproduces identically on
the sibling `apify` app unmodified, so it is a property of how the tool is invoked (`--config
./deno.json` picks up `_tools/deno.json` instead when run from inside the app directory), not of
this app. Run the audit directly instead:

```bash
cd ../../_tools && deno run --no-check -A audit.ts whop
```
