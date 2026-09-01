# Mollie

Accept payments over 30+ methods (iDEAL, cards, Bancontact, SEPA Direct Debit, PayPal, Klarna, and
more) on **Mollie**, the European payment gateway — Payments, hosted Payment Links, and recurring
Subscriptions billed against a saved Mandate.

- **Categories** — commerce, finance
- **Auth methods** — bearer (API Key — also accepts an Advanced Access Token or a hand-obtained
  OAuth access token, all three presented the same way)
- **Actions** — 41
- **Health checks** — 2 live probes (`service`, `quota`) + the derived `auth:bearer`
- **Egress allowlist** — `api.mollie.com` (the `service` check adds `status.mollie.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.mollie.com/
- **API docs** — https://docs.mollie.com
- **Status page** — https://status.mollie.com

> **Everything below was verified against Mollie's own sources on 2026-09-01** — the OpenAPI 3.1
> documents `docs.mollie.com` (ReadMe.io) embeds per doc *category* (fetched and read in full: 44
> operations under "Accepting payments", 18 under "Recurring", plus "Mollie Connect"), the prose
> guide pages fetched alongside them (authentication, pagination, error handling, rate limiting),
> and live probes against `api.mollie.com` and `status.mollie.com`. Nothing here came from a
> third-party integration directory or an inferred guess.

## The three things most likely to cost someone a day

### 1. Amounts are exact decimal STRINGS, never integer cents

Unlike Razorpay/Stripe-style APIs, Mollie represents every monetary amount as an object with a
STRING value:

```json
{ "currency": "EUR", "value": "10.00" }
```

There is no smallest-currency-sub-unit integer anywhere in this API — `value` carries the
currency's natural number of decimal places as a string. A naive `Math.round(amount * 100)`
integer-cents conversion, the instinct anyone coming from Stripe/Razorpay will have, is the wrong
*shape*, not just wrong by a factor of 100. See `lib/client.ts` and `lib/params.ts`'s
`amountParams`/`amountFrom`.

### 2. The docs promise `401` for a bad credential; live traffic answers `400`

`docs.mollie.com/overview/handling-errors` shows a worked example of a bad API key returning:

```
HTTP/1.1 401 Unauthorized
{"status": 401, "title": "Unauthorized Request", "detail": "Missing authentication, or failed to authenticate"}
```

Measured live on 2026-09-01 against `api.mollie.com/v2/profiles/me`, **every** credential problem
this app could provoke from the outside — no `Authorization` header at all, a header with no
`Bearer ` prefix, a syntactically-plausible-but-wrong `live_`/`test_` key — answered instead:

```
HTTP/1.1 400 Bad Request
{"status": 400, "title": "Bad Request", "detail": "Invalid Authorization header"}
```

A gateway in front of the API appears to reject the header's *shape* before authentication logic
ever runs, for every case this app could reach without a real credential. `auth/bearer.ts`'s `test`
hook classifies by the response body's `title`/`detail` — a `400` with that exact `detail` is "no
usable credential reached the request", a `401` is "the request was rejected" — never by assuming a
fixed status code means one specific thing. See its module doc for the full write-up.

### 3. The "checkout URL" lives at a different `_links` key per resource

A **Payment**'s shareable customer-facing URL is `_links.checkout.href`. A **Payment Link**'s is
`_links.paymentLink.href`. Neither is `_links.self.href` — that key is always the API resource URL
itself (what you'd `GET` to refetch the object), never a page a customer can open. Verified
directly against each resource's own OpenAPI schema (`oas_accepting-payments.json`'s
`/payments` and `/payment-links` response bodies) rather than assumed from one resource's shape.

## Orders API: deprecated by Mollie itself — not implemented

The task that started this app explicitly named **Orders** as a reference-nav section to check.
Mollie's own sidebar data marks every `orders-api` operation (`create-order`, `list-orders`,
`get-order`, `update-order-line`, …) `"deprecated": true`, under a doc category named "Receiving
orders" alongside a separate, equally deprecated "Shipments API". Mollie's stated replacement is
the Payments API's own `lines` field — order lines attached directly to a payment, which is why
this app's `payment-create`/`customer-payment-create` actions accept `lines` is intentionally
**not** wired up either (see "Deliberately out of scope" below) since a workflow accepting a
payment does not need per-line-item detail unless it uses a line-item-requiring method
(`billie`/`in3`/`klarna`/`riverty`/`voucher`), which is itself an advanced case this first pass
leaves for later. The Orders API itself is not built at all — building a deprecated API into a new
app would ship dead weight from day one.

## Auth

One method: `bearer`, type `bearer` — `Authorization: Bearer <token>`. Verified against the
security scheme embedded in `docs.mollie.com`'s OpenAPI documents (`{"type": "http", "scheme":
"bearer"}`) and the `overview/authentication` guide page.

Mollie's own docs describe **four** authentication methods: API keys (default, per website
profile), Advanced Access Tokens (organization-wide, optionally scoped to a mode/profile), App
Access Tokens via OAuth (acting on behalf of a connected merchant), and HTTP Basic for the OAuth
token endpoint itself. The first three are all presented the same wire way — `Authorization: Bearer
<token>` — so this app's one `bearer` method covers a plain API key, an Advanced Access Token, or a
hand-obtained OAuth access token; it does not implement the OAuth authorization-code exchange
itself. Mollie's own guidance is to start with an API key, which is what this app's `fields`/`hint`
steer toward.

An API key is either `live_...` (real money) or `test_...` (Mollie's simulated test mode) — both
against the *same* `api.mollie.com` host; there is no separate sandbox origin. `afterConnect` labels
the connection from this prefix (no network call needed for that part) plus the profile name/status
the credential-liveness probe already fetched.

### The credential probe: `GET /v2/profiles/me`

Chosen by reading the response schema, not the name: it names the *profile itself* (id, name,
status, website, email) rather than any resource an Advanced Access Token might legitimately be
scoped away from, and — unlike a `GET /v2/payments?limit=1` probe — returns **no payment data at
all**, so the health surface never stores a customer's payment history just to answer "is this key
live?". A standard API key is already scoped to exactly one profile, so this always resolves
without a `profileId` query param.

## Actions

41 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `payment-create` | perform | `POST /v2/payments` |
| `payment-get` | read | `GET /v2/payments/{id}` |
| `payment-list` | search | `GET /v2/payments` |
| `payment-update` | perform | `PATCH /v2/payments/{id}` |
| `payment-cancel` | perform | `DELETE /v2/payments/{id}` |
| `payment-refund-create` | perform | `POST /v2/payments/{id}/refunds` |
| `payment-refund-list` | search | `GET /v2/payments/{id}/refunds` |
| `payment-refund-get` | read | `GET /v2/payments/{id}/refunds/{refundId}` |
| `payment-refund-cancel` | perform | `DELETE /v2/payments/{id}/refunds/{refundId}` |
| `refund-list` | search | `GET /v2/refunds` (account/profile-wide) |
| `payment-chargeback-list` | search | `GET /v2/payments/{id}/chargebacks` |
| `payment-chargeback-get` | read | `GET /v2/payments/{id}/chargebacks/{chargebackId}` |
| `chargeback-list` | search | `GET /v2/chargebacks` (account/profile-wide) |
| `method-list` | search | `GET /v2/methods` (enabled only) |
| `method-list-all` | search | `GET /v2/methods/all` (every method, enabled or not) |
| `method-get` | read | `GET /v2/methods/{id}` |
| `payment-link-create` | perform | `POST /v2/payment-links` |
| `payment-link-get` | read | `GET /v2/payment-links/{id}` |
| `payment-link-list` | search | `GET /v2/payment-links` |
| `payment-link-update` | perform | `PATCH /v2/payment-links/{id}` |
| `payment-link-delete` | perform | `DELETE /v2/payment-links/{id}` |
| `customer-create` | perform | `POST /v2/customers` |
| `customer-get` | read | `GET /v2/customers/{id}` |
| `customer-list` | search | `GET /v2/customers` |
| `customer-update` | perform | `PATCH /v2/customers/{id}` |
| `customer-delete` | perform | `DELETE /v2/customers/{id}` |
| `customer-payment-create` | perform | `POST /v2/customers/{id}/payments` |
| `customer-payment-list` | search | `GET /v2/customers/{id}/payments` |
| `mandate-create` | perform | `POST /v2/customers/{id}/mandates` |
| `mandate-list` | search | `GET /v2/customers/{id}/mandates` |
| `mandate-get` | read | `GET /v2/customers/{id}/mandates/{mandateId}` |
| `mandate-revoke` | perform | `DELETE /v2/customers/{id}/mandates/{mandateId}` |
| `subscription-create` | perform | `POST /v2/customers/{id}/subscriptions` |
| `subscription-get` | read | `GET /v2/customers/{id}/subscriptions/{subscriptionId}` |
| `subscription-list` | search | `GET /v2/customers/{id}/subscriptions` |
| `subscription-update` | perform | `PATCH /v2/customers/{id}/subscriptions/{subscriptionId}` |
| `subscription-cancel` | perform | `DELETE /v2/customers/{id}/subscriptions/{subscriptionId}` |
| `subscription-list-all` | search | `GET /v2/subscriptions` (account/profile-wide) |
| `subscription-payment-list` | search | `GET /v2/customers/{id}/subscriptions/{subscriptionId}/payments` |
| `profile-get` | read | `GET /v2/profiles/me` |
| `profile-list` | search | `GET /v2/profiles` |

### Idempotency

**Money-moving creates are `idempotent: false`**: `payment-create`, `payment-refund-create`,
`payment-link-create`, `customer-create`, `customer-payment-create`, `mandate-create`,
`subscription-create`. A runtime retry of any of these could start a second payment, double-refund,
or double-create a resource — Mollie's API has no idempotency-key mechanism this app could lean on
instead (unlike Razorpay's `X-Refund-Idempotency` for refunds specifically).

**Pure state-transition performs are `idempotent: true`**: `payment-update`, `payment-cancel`,
`payment-refund-cancel`, `payment-link-update`, `payment-link-delete`, `customer-update`,
`customer-delete`, `mandate-revoke`, `subscription-update`, `subscription-cancel`. An update
overwrites named fields, and a cancel/delete/revoke's end state is the same however many times it
runs (a repeat call on an already-canceled/deleted/revoked resource returns Mollie's own 404/410
rather than a different outcome).

### Notes on individual actions

- **`payment-create`'s `redirectUrl` is documented as required, with a stated exception.** Mollie's
  own schema lists it in `required`, but its description says it "can be omitted for recurring
  payments (`sequenceType: recurring`) and for Apple Pay payments with an `applePayPaymentToken`".
  This app declares it optional in the `Param` so a recurring-payment workflow isn't forced to
  fabricate a URL nobody visits, and lets Mollie's own validation enforce the rule for a one-off
  payment that genuinely needs it.
- **`method-list`/`method-list-all`/`method-get`'s `amount` filter uses `style: deepObject`
  encoding** (`amount[value]=10.00&amount[currency]=EUR`), confirmed from the OpenAPI parameter
  definition — not a JSON-encoded query string, which is what several other resources' body fields
  might tempt you to assume.
- **`payment-link-list` unwraps `_embedded.payment_links`** — with an underscore, unlike every
  other list envelope in this app (`payments`, `customers`, `refunds`, `chargebacks`, `methods`,
  `mandates`, `subscriptions`, `profiles`), which are all bare camelCase/lowercase plural nouns.
  Verified directly against the OpenAPI response schema; `lib/client.ts`'s `unwrapList` takes the
  key as an explicit argument for exactly this reason rather than deriving it from the path.
- **`mandate-create`'s required fields depend on `method`.** SEPA Direct Debit needs
  `consumerAccount` (IBAN); PayPal needs `consumerEmail` plus a billing-agreement or vault ID.
  Mollie's own docs state only SEPA Direct Debit and PayPal mandates "can be created directly" — a
  credit-card mandate is normally established via a `first` payment instead, which this app's
  `method` select surfaces as a hint rather than blocking the option outright.
- **List endpoints use cursor pagination (`from`/`limit`), not page numbers.** `from` is the ID of
  the first object in the desired page, not an offset; `sort` (`asc`/`desc`) exists on some
  list endpoints and not others — this mirrors the vendor's own OpenAPI parameter lists per
  endpoint exactly, rather than inventing a uniform shape the API doesn't have.
- **`testmode` and `profileId` matter only for an Advanced Access Token/OAuth token**, both declared
  as `advanced` params on nearly every action. A plain API key is already `live_`/`test_`-scoped and
  belongs to exactly one profile, so both are ignored for the common case.

## Health checks

Two live probes, plus the derived `auth:bearer`.

### `service` — real, but on a different vendor than the Statuspage-shaped guess

`status.mollie.com` looks, at a glance, like it might be an Atlassian Statuspage instance — the
common pattern across this pack. It is not: it's an **Instatus**-hosted page (confirmed by its
Next.js asset paths under `/_next/static/`). Measured live on 2026-09-01:

| Path | Status | Content-Type | Shape |
| --- | --- | --- | --- |
| `/api/v2/summary.json` | 200 | `application/json` | real, but only `{page, activeMaintenances}` — no components |
| `/api/v2/incidents.json` | 404 | `text/html` | Instatus has no such path |
| `/api/v2/components.json` | 200 | `application/json` | the real per-component tree — one leaf literally named "Mollie API", `description: "api.mollie.com"` |

`summary.json` is real but nearly useless here (Instatus's summary omits the components list unless
something is actively degraded). `components.json` is what `health/service.ts` actually reads. The
verdict is driven by a small covered set (`Mollie API`, `Mollie Connect`, `Webhook`, `Mollie payment
links`, `Hosted checkout`) — the components this app's actions actually call through; every other
component (any specific local/international payment method, Settlements, Business Accounts
integrations, …) is still reported, for context, but never worsens the roll-up on its own.

### `quota` — a real, documented header this app has no credential to confirm live

`docs.mollie.com/reference/rate-limiting` documents structured `RateLimit`/`RateLimit-Policy`
headers on every response — but the page itself states *"This feature is being rolled out gradually
and may not be available to everyone yet."* Live probes against `api.mollie.com/v2/methods` (both
unauthenticated and with a syntactically-plausible key) on 2026-09-01 carried **no** such header at
all, consistent with the documented gradual rollout rather than a vendor that never publishes one.
Because this app has no real credential to probe a rolled-out account with, `health/quota.ts` is a
live probe that reports `unknown` — not `down`, and not a declared absence — whenever the headers
are missing. An account the rollout has reached gets a real reading (`ok`/`degraded` on the
`RateLimit` header's `r`/`RateLimit-Policy`'s `q`); one it hasn't gets an honest "can't tell".

## Deliberately not covered

Mollie's full API surface is far larger than one merchant's payment-gateway path. This app covers
Payments, Refunds, Chargebacks, Methods, Payment Links, Customers, Mandates and Subscriptions — the
path a workflow needs to accept a payment and later reconcile, refund, or bill a recurring charge —
and leaves out:

- **Orders API** (and its companion Shipments API) — **deprecated by Mollie itself**; see above.
- **Mollie Connect** (OAuth-based platform/marketplace access on behalf of *other* Mollie
  merchants) — Organizations, Clients, Client Links, Balance Transfers, Onboarding, Capabilities,
  Permissions, and Profile create/update/delete beyond the read-only `profile-get`/`profile-list`
  this app ships. A different activation and a different account relationship: a platform managing
  *other* merchants' funds, not a merchant's own gateway.
- **Business operations** — Balances, Settlements, Invoices, Payouts, Sales Invoices, Business
  Accounts (Transfers, Verify Payee, Draft Transfers) — treasury/accounting surfaces layered on top
  of the payment-gateway core, left out for scope.
- **Terminals, Wallets (Apple Pay sessions), Delayed Routing, Unmatched Credit Transfers, Sessions
  (Checkout Sessions), Captures** — advanced/niche flows (in-person card readers, manual
  authorize-then-capture, Mollie-Connect fee routing) layered on the same core resources; worth
  adding later but not part of this first pass.
- **`lines` (order line items) on `payment-create`/`customer-payment-create`** — required only for
  a handful of methods (`billie`, `in3`, `klarna`, `riverty`, `voucher`); every other field this app
  exposes works without it. Left out of this pass's params rather than half-modeled; the vendor's
  full line-item schema (VAT, discounts, categories, SKUs) is substantial enough to warrant its own
  pass if/when those methods are prioritized.

## Icon

`assets/icon.png` is Mollie's own mark — the white lowercase "m" glyph on a black rounded-square
tile. Fetched **verbatim** from `https://framerusercontent.com/images/SeL6IJlQ4Ae7noV1fXjkTlqvo.png`
(served from Framer's CDN, since Mollie's own marketing site is Framer-built and this is the
favicon its `<link rel="icon">` tag names) — 96×96 PNG, 1,166 bytes, unmodified.

## Layout

```
mollie/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # MollieClient, error formatting, list-envelope unwrapping
│   └── params.ts                 # shared Param fragments (amount pair, pagination, resource ids)
├── auth/bearer.ts               # API Key (Bearer token): sign, test, afterConnect
├── actions/                     # one file per action (41)
├── health/
│   ├── service.ts                # status.mollie.com's real Instatus feed
│   └── quota.ts                  # documented RateLimit/RateLimit-Policy headers, gracefully absent
├── assets/icon.png               # vendor mark, fetched verbatim from Framer's CDN
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt`
deno task test
```
