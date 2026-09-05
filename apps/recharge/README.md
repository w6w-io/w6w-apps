# Recharge

Manage customers, addresses, subscriptions, one-time purchases, charges, orders, discounts and
webhooks on **Recharge**, the recurring-billing platform for Shopify (and BigCommerce / custom)
ecommerce stores — over the **Recharge API `2021-11`**.

- **Categories** — commerce, finance
- **Auth methods** — api-token
- **Actions** — 29
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-token`
- **Egress allowlist** — `api.rechargeapps.com` (the `service` check adds
  `status.getrecharge.com` to its own hook allowlist, never to the app's)
- **Website** — https://getrecharge.com/
- **API docs** — https://developer.getrecharge.com/
- **Status page** — https://status.getrecharge.com/

> **Everything below was verified on 2026-09-05** against Recharge's own API reference
> (`developer.getrecharge.com`, a Nuxt-rendered reference whose version selector offers exactly two
> entries — `2021-01` and `2021-11`, with `2021-11` selected by default and its own
> [release notes](https://changelog.rechargepayments.com/recharge-api-v2021-11-is-now-available-4syNNK)
> linked from the reference's own "Versioning" section) plus live probes against
> `api.rechargeapps.com` and `status.getrecharge.com`. Nothing here came from a third-party
> integration directory or a sibling app in this pack.

## The findings that shaped this app

### 1. The auth header is a custom one, not `Authorization: Bearer`

Recharge's own "Authentication" section states it plainly:

> Each request to the API should contain an API token in the following header:
> `X-Recharge-Access-Token:store_api_token`

Confirmed live: an unauthenticated `GET /token_information` and the same request signed with a
syntactically-plausible **fake** token both answer `401 {"error":"bad authentication"}` — there is
no `Authorization: Bearer` form documented or observed anywhere in this API. `auth/api-token.ts`
declares `apiKey: { in: "header", name: "X-Recharge-Access-Token" }` with **no prefix**, unlike most
other apps in this pack.

### 2. Two error shapes, not one

Read directly from the reference's embedded example-response data rather than guessed:

- `401` / `404` answer `{"error": "<string>"}` — a bare string, e.g. `{"error": "bad authentication"}`
  (measured live) or `{"error": "address not found"}` (a documented example).
- `422` answers `{"errors": {"<field>": ["<message>", …]}}` — a Rails-style validation error keyed
  by field name, e.g. `{"errors": {"date": ["Date must be at least one day in the future"]}}`.

`formatRechargeError` in [`lib/client.ts`](lib/client.ts) reads both shapes rather than assuming
either — getting this wrong is how a validation error like "which field, and why" turns into a bare
`HTTP 422` with no actionable detail.

### 3. Cursor pagination is the only form this app uses

"Starting with the 2021-11 version of the API, you will not be able to retrieve a count of total
records for a given `GET` request" — the reference's own recommendation is `next_cursor` /
`previous_cursor`, and `page`-based pagination is documented `*Deprecated` on every list endpoint
checked (still capped at page 100 when used at all, per the reference). Every list action here
exposes `limit` + `cursor`, never `page`.

### 4. Processed charges older than 90 days quietly disappear

Since March 19th, 2025, a *processed* charge (`status` one of `success`, `refunded`,
`partially_refunded`) whose `processed_at` is more than 90 days in the past no longer appears in
`GET /charges` list responses, and `GET /charges/{id}` on one now answers an error instead of the
charge. `queued`/`error`/other statuses are unaffected. This app surfaces both behaviours as-is
(an empty/partial list, or the vendor's own error) rather than papering over them — see
[`actions/charge-list.ts`](actions/charge-list.ts) and [`actions/charge-get.ts`](actions/charge-get.ts).

### 5. The rate-limit header is real, but undocumented in shape

The reference states in prose only that "some of our API resources and endpoints may be limited"
and paces its own SDK code samples with `sleep(1)` — no header name is documented anywhere. A live
probe against `GET /token_information` on 2026-09-05 found one anyway: every response signed with a
token — including one outright rejected — carries `x-recharge-limit: <used>/<cap>`, and the counter
visibly increments across requests (`1/40`, `2/40`, `3/40` measured on three consecutive calls with
the same token). No reset time or window length is exposed. `health/quota.ts` reads it and reports
only what it can measure.

### 6. `GET /token_information` is the one endpoint that needs no scope

Every other section of the reference states an explicit `Scopes:` line (`read_customers`,
`read_store`, …). "Retrieve token information" states none — it describes the token itself (its
own name, contact email, and the scopes it carries), not a scoped resource, so it is reachable by
the narrowest token a merchant can issue. That is why it is both this app's credential-liveness
probe (`auth/api-token.ts`) and the endpoint the `quota` health check reads its rate-limit header
from — one call answers both questions, and `minIntervalSeconds` keeps the added cost to once a
minute.

### 7. Payment methods never carry a full card number

Recharge's own `payment_details` schema returns only `brand` / `last4` / `exp_month` / `exp_year` —
never a full card number, on this endpoint or any other in the API. `processor_customer_token` /
`processor_payment_method_token` are the **payment processor's own** tokenized references (e.g. a
Stripe `cus_…`/`pm_…`), meaningless without that processor's own secret API key, which this app never
holds — so `actions/payment-method-list.ts` returns them as documented rather than inventing a
redaction Recharge itself does not need.

## Auth

**API Token** (`auth/api-token.ts`) — paste a token from the Recharge merchant portal's API token
settings (or a custom-integration token, if issued that way). A token carries a fixed,
merchant-configured set of scopes; every write action in this app documents the scope it needs, and
a token scoped narrower than an action's need is expected to fail that action specifically rather
than the whole Connection — the health probe (`token_information`) needs none at all.

Recharge publishes no OAuth surface for third-party apps in this reference — the token is the whole
authentication story.

## Health checks

| Key | Kind | Scope | Credential | What it reports |
|---|---|---|---|---|
| `service` | `service` | app | none | The **`Recharge API`** component (id `w0w91qvm66xy`) from Recharge's Statuspage. The same page also tracks Shopify/BigCommerce integration components Recharge depends on — those are surfaced for context in `components`/`message` but never drive this check's own verdict, since a Shopify-side incident is not this app's failure mode. |
| `quota` | `quota` | connection | signed | Requests used against the store's per-token rate-limit budget this window, read from the undocumented but live `x-recharge-limit` header on `GET /token_information`. |
| `auth:api-token` | derived | connection | signed | The Auth method's own `test` hook, projected automatically. |

`status.getrecharge.com` was verified as Recharge's real, claimed Statuspage — not a decoy — three
ways: it answers distinct, real JSON at `/api/v2/summary.json` and `/api/v2/status.json`; the two
tempting default-subdomain guesses (`getrecharge.statuspage.io`, `rechargepayments.statuspage.io`)
both redirect to `statuspage.io`'s own marketing page (the unclaimed-host signature), while
`status.rechargepayments.com` redirects to this exact URL; and the page names 29 real components
including a component literally titled `Recharge API`.

## Actions

**Customers** — `customer-list`, `customer-get`, `customer-create`, `customer-update`
**Addresses** — `address-list`, `address-get`, `address-update`
**Subscriptions** — `subscription-list`, `subscription-get`, `subscription-create`,
`subscription-cancel`, `subscription-activate`, `subscription-set-next-charge-date`
**Charges** — `charge-list`, `charge-get`, `charge-skip`, `charge-unskip`, `charge-refund`
**Orders** — `order-list`, `order-get`
**Catalog** — `product-list`, `discount-list`
**Onetimes** — `onetime-list`, `onetime-create`
**Payment methods** — `payment-method-list`
**Webhooks** — `webhook-list`, `webhook-create`, `webhook-delete`
**Token** — `token-information-get`

### Left out, deliberately

Recharge's reference documents considerably more surface than this app covers — Collections, Bundle
Selections, Credit Accounts & Adjustments, Plans, Checkouts, Async Batches, Metafields, and Customer
Entitlements among them. This app's scope is the day-to-day subscription-lifecycle path a workflow
most often needs; the rest was left out on scope, not because any detail of it could not be
confirmed. Two address-level operations documented in the reference — `POST /addresses/merge` and
`POST /addresses/{id}/charges/skip` — were likewise left out as narrower special cases of address
and charge management already covered by the actions above.

### Webhook topics

`webhook-create`'s `topic` field is the full vendor-documented catalogue from the reference's
"Available webhooks" table (`lib/params.ts`'s `webhookTopicOptions`), spanning Address, Async batch,
Bundle Selection, Customer, Charge, Checkout, Gift Purchase, Onetime, Order, Plan, Subscription,
Store and the `recharge/uninstalled` app-lifecycle event. Registering for `<object>/<event>`
requires the matching `read_<object-plural>` scope on the token (e.g. `subscription/created` needs
`read_subscriptions`) — the reference states this explicitly. `checkout/completed` is documented
deprecated but "will not be removed from this API version," so it stays in the list.

## What's not here

- **OAuth.** Not documented for third-party apps in this reference; API token only.
- **Collections, Bundle Selections, Credit Accounts, Plans, Checkouts, Async Batches, Metafields,
  Customer Entitlements.** See "Left out, deliberately" above.
- **A `request-rate` / `X-RateLimit-Reset` reading.** The vendor exposes no reset time or window
  length alongside `x-recharge-limit`, so `quota` reports only the used/cap pair it can measure.
