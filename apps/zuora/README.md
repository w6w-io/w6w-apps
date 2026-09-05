# Zuora

Manage customer accounts, subscriptions, invoices, payments and orders in
Zuora — a subscription billing and monetization platform.

- **Categories** — finance
- **Auth methods** — client-credentials
- **Actions** — 14
- **Egress allowlist** — the ten regional/environment hosts below (the
  `service` health check separately adds `zuora.statuspage.io`)
- **Website** — https://www.zuora.com
- **API docs** — https://developer.zuora.com/v1-api-reference/introduction

Every endpoint this app calls was checked against that live reference (and its
per-operation pages) on 2026-09-05.

## Which environment? — ten hosts, not two

Zuora provisions a tenant in one of three regions, and within a region on a
specific cloud/environment. The v1 API reference lists exactly these ten base
URLs and no others:

| Environment | Host | This app's region key |
|---|---|---|
| US Production (Cloud 2) | `rest.zuora.com` | `us-cloud2` (default) |
| US Production (Cloud 1) | `rest.na.zuora.com` | `us-cloud1` |
| EU Production | `rest.eu.zuora.com` | `eu` |
| APAC Production | `rest.ap.zuora.com` | `ap` |
| US API Sandbox (Cloud 2) | `rest.apisandbox.zuora.com` | `us-cloud2-sandbox` |
| US API Sandbox (Cloud 1) | `rest.sandbox.na.zuora.com` | `us-cloud1-sandbox` |
| EU API Sandbox | `rest.sandbox.eu.zuora.com` | `eu-sandbox` |
| US Developer & Central Sandbox (Test Drive / trial) | `rest.test.zuora.com` | `us-central` |
| EU Developer & Central Sandbox | `rest.test.eu.zuora.com` | `eu-central` |
| APAC Developer & Central Sandbox | `rest.test.ap.zuora.com` | `ap-central` |

Note there is **no APAC API Sandbox** — APAC only has Production and a
Developer & Central Sandbox. A tenant's cloud (1 vs 2, for US) is assigned by
Zuora at provisioning, not something you choose; check your tenant's login URL
or ask a Zuora admin which one you're on. **A credential (OAuth client) minted
against one host is unknown to every other host** — the `region` field on the
connection is what routes every request, including the token exchange itself,
to the right one.

## Setup

1. In the Zuora UI, create an **OAuth Client** for your tenant (the exact menu
   path varies by tenant version — look under Administration → Manage Users,
   or Platform → OAuth Clients) and note its Client ID and Client Secret.
2. When connecting this app, paste the Client ID and Client Secret and pick
   the **Zuora Environment** matching where that OAuth Client lives (see the
   table above).

The app exchanges the id/secret for a bearer token via `POST /oauth/token`
using the `client_credentials` grant — there is no browser sign-in step, so
this works in a scheduled/background run.

### Three things that would otherwise cost you a day

1. **The token endpoint is `application/x-www-form-urlencoded`, not JSON**,
   and Zuora's own docs say not to set *any* authentication headers
   (`Authorization`, `apiAccessKeyId`, `apiSecretAccessKey`) on that call — a
   stale credential header alongside the form body is a documented way to
   break the exchange. This app never sets one there.
2. **The OAuth endpoint has its own, much tighter, per-IP rate limit.**
   Zuora's general API limit is 50,000 requests/minute per tenant (Production),
   but the AUTH bucket is capped at 2,000/minute **per tenant and only
   100/minute per IP address** — a limit that a shared outbound IP (a NAT
   gateway, a serverless platform) can hit long before any per-tenant ceiling
   does. Zuora's own docs warn against minting a token per request; this app
   mints one in `exchange` and again only in `refresh`, holding it until a
   minute before it expires.
3. **Zuora also enforces a *separate* concurrent-request limit**, independent
   of the per-minute/hour/day counters: 40 concurrent requests by default, 80
   for Object Query, and 200 for a short list of "high-volume" operations that
   includes Create an account, Create an order and Create a subscription. A
   burst of parallel workflow runs can 429 well before the rate-limit headers
   would suggest trouble — check whether a `429` came from the token endpoint
   (5 req/min... no — 100/min per IP) or the general API (50,000/min) before
   assuming which limit was hit; see `lib/client.ts`'s `describeError`.

## Why every list action uses Object Query, not the classic endpoints

Zuora's older `/v1/*` surface has, per object, whichever of "list", "get",
"create", "update", "delete" it happens to support — and several of the ones
that DO exist are gated behind an optional feature:

- `/v1/payments` (list/get/create/update/delete) — documented as "only
  available if you have Invoice Settlement enabled".
- `/v1/orders` (list/get) — documented as gated behind the legacy "Order
  Metrics" feature, which Zuora's own docs say "is no longer available as a
  standalone feature" as of Billing Release 284.
- `/v1/accounts` has **no bulk list operation at all** — only "retrieve one by
  key" and "retrieve a summary".

`/object-query/*` is the one part of the v1 API with a real, generic list
operation for every object here — cursor pagination (`nextPage`) and
`field.OP:value` filter clauses (`EQ`, `NE`, `LT`, `LE`, `GT`, `GE`, `SW`,
`IN`), ANDed together (Object Query has no OR) — and it carries none of the
above feature gates. So every `*-list` action, plus `payment-get` and
`order-get`, goes through it; `account-get`, `invoice-get` and
`subscription-get` use the classic per-key endpoints, which have no such gate
and return the fuller object shape.

## Actions

| Key | Type | Description |
|---|---|---|
| `account-list` | read | List accounts (Object Query, with `filter`/`sort`) |
| `account-get` | read | Retrieve one account's basic info, contacts and billing setup |
| `account-create` | perform | Create a customer account with a bill-to contact |
| `account-update` | perform | Update an account — only the fields provided are changed |
| `subscription-list` | read | List subscriptions (Object Query) |
| `subscription-get` | read | Retrieve the latest version of a subscription |
| `subscription-create` | perform | Create a subscription with a single product rate plan |
| `invoice-list` | read | List invoices (Object Query) |
| `invoice-get` | read | Retrieve a specific invoice |
| `payment-list` | read | List payments (Object Query — bypasses the Invoice Settlement gate) |
| `payment-get` | read | Retrieve a specific payment (Object Query) |
| `order-list` | read | List orders (Object Query — bypasses the Order Metrics gate) |
| `order-get` | read | Retrieve a specific order (Object Query) |
| `order-create` | perform | Create an order — see below, requires the Orders feature |

### `order-create`'s `subscriptions` field is raw JSON, on purpose

An order's `subscriptions` array is a list of order-action bundles — add a
product, remove one, renew, cancel, change owner, replace a rate plan, and
more — each with its own deeply nested schema (Zuora's own reference runs to
thousands of documented fields once every order-action variant is counted).
Modelling that faithfully as typed form fields here would mean re-deriving a
large fraction of Zuora's object model; modelling only the common cases would
silently hide the rest. So this action passes `subscriptions` straight
through as JSON, in exactly the shape Zuora's own reference gives as the
example for creating one new subscription via an order:

```json
[{
  "orderActions": [{
    "type": "CreateSubscription",
    "createSubscription": {
      "terms": {
        "initialTerm": {"period": 12, "periodType": "Month", "termType": "TERMED"},
        "renewalSetting": "RENEW_WITH_SPECIFIC_TERM",
        "renewalTerms": [{"period": 12, "periodType": "Month"}]
      },
      "subscribeToRatePlans": [{"productRatePlanId": "8ad081dd9096ef9501909b40bb4e74a4"}]
    }
  }]
}]
```

For the single-subscription, single-rate-plan case, use `subscription-create`
instead — it takes typed params and needs no Orders feature.

## Deliberately left out

Real, documented Zuora endpoints that this app does not implement, because
covering them accurately would mean re-deriving a large fraction of Zuora's
object model rather than a small, verifiable action set:

- Standalone invoice creation, batch posting, cancel/reverse/write-off,
  splitting, taxation items, PDF/file management.
- Payment creation, apply/unapply, transfer, refund (with or without
  auto-unapply) — all Invoice-Settlement-gated and each with its own sizeable
  request shape.
- Credit memos, debit memos, bill runs, invoice schedules, payment schedules.
- Usage/mediation, custom objects, workflows, data query/AQuA, the legacy
  `/v1/action/{create,update,delete,query,queryMore}` batch surface.
- Every `order-create` order-action type beyond `CreateSubscription` (add
  product, remove product, renew, cancel, suspend/resume, change owner,
  replace rate plan, …) — reachable through `order-create`'s raw
  `subscriptions` JSON field, just not validated or form-driven here.

If you need one of these, `client.request()` in `lib/client.ts` is a thin
wrapper over `ctx.fetch` and the endpoint paths above are all real — but they
are not exposed as typed actions today.

## Health checks

- **`service`** (kind `service`, scope `connection`) — reads
  `zuora.statuspage.io` (a real, claimed Statuspage instance, `page.url`
  `https://trust.zuora.com`), resolving to the specific region/cloud **group**
  this connection uses (e.g. "AMERICAS - CLOUD 2 (NA2)") and reading only that
  group's `Production API` / `Sandbox API` / `Central Sandbox` component — an
  outage in a different region's cloud never turns this connection down. The
  "Central Sandbox" environments are listed once per region on the status page
  without saying which underlying cloud backs them; this app resolves the US
  one against the NA2 group as a documented assumption (see `lib/client.ts`'s
  `REGIONS` table).
- **`quota`** (kind `quota`, severity `informational`) — reads the
  `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` headers Zuora
  returns on every response, off the same cheap call the credential check
  makes. These are **tenant-level** limits, not per-connection.
- **`auth:client-credentials`** (derived) — the connect-time credential probe,
  reused automatically as a health check: `GET /object-query/accounts?pageSize=1`,
  the cheapest authenticated call this API has (no object needs to exist, no
  scope beyond a base read grant).

## What's NOT reused from a sibling app

Zoho's regional apps in this pack (`zoho`, `zohobooks`, `zoho-invoice`, …)
model each data centre as a **separate OAuth `AuthDefinition`**, because
Zoho's browser-based authorization-code flow redirects to a region-specific
`accounts.zoho.<tld>` host *before* any in-form field could be read. Zuora's
auth is `client_credentials` with no browser step at all, so nothing forces
that split here — the region is just a `select` field read before the token
call is made, the same shape this pack's `vanta` app already uses for its
commercial/FedRAMP split. One `AuthDefinition`, ten `select` options, rather
than ten near-identical `AuthDefinition`s.
