# Lemon Squeezy

Sell software and digital products through Lemon Squeezy — catalog (products, variants, prices),
customers, orders and refunds, subscriptions, discounts, license keys, custom checkouts and
webhooks, on the **Lemon Squeezy API**.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 36
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.lemonsqueezy.com`
- **Website** — https://www.lemonsqueezy.com/
- **API docs** — https://docs.lemonsqueezy.com/api
- **Status page** — https://status.lemonsqueezy.com/

Lemon Squeezy is a merchant of record for software and digital products: it sells on your behalf
and handles payment collection, sales tax/VAT and invoicing worldwide. This app's centre of
gravity is that catalog-to-cash lifecycle — products through orders, subscriptions, and the
webhooks/checkouts that connect them to the rest of a workflow.

> **Everything below was verified against Lemon Squeezy's own sources on 2026-09-05** — the
> developer documentation at `docs.lemonsqueezy.com/api`, plus live probes against
> `api.lemonsqueezy.com` the same day. Nothing here came from a third-party integration directory.

## How the docs were actually read

`docs.lemonsqueezy.com/api` is a client-side-rendered Next.js app. A plain HTTP fetch of a resource
page (e.g. `/api/products/list-all-products`) returns only page chrome and navigation — the actual
reference content (attributes, filter parameters, example request/response bodies) is not present
in that HTML at all, and a naive scrape would have produced an app built on nothing. Each page's
content was instead read from its React Server Components payload embedded in the response, which
carries the exact MDX source Lemon Squeezy's own docs repository
(`github.com/Make-Lemonade/lemonsqueezy-docs`) authored for that page — the primary source, not a
rendering of it. This is stated up front because it is the reason this app could be built
accurately at all against a docs site that answers "200" to a bot with no reference content in the
body.

## The five things most likely to go wrong

### 1. This is JSON:API, and both headers are required on *every* request

`docs.lemonsqueezy.com/api/getting-started/requests`, "Requirements": both `Accept:
application/vnd.api+json` and `Content-Type: application/vnd.api+json` "must be included with all
requests to the API" — not only writes. The vendor's own authenticated-request example sends both
headers on a plain `GET` with no body. `lib/client.ts` sends both unconditionally rather than
gating `Content-Type` on the presence of a body, which is what a non-JSON:API client would normally
do.

### 2. One host, no environment split

Unlike `apps/paddle`, a Test-mode key and a Live-mode key both call `api.lemonsqueezy.com` — the
docs: "Any API keys created in Test mode will interact with your test mode store data." Which
dataset a call touches is decided entirely by the key; every resource carries its own `test_mode`
boolean, and there is no host to rewrite in `sign`.

### 3. Cancelling a subscription flips its status immediately, but access runs until `ends_at`

`DELETE /v1/subscriptions/:id`'s own example response comes back with `status: "cancelled"` right
away — unlike Paddle, where a default cancel only schedules the change. What does **not** change
immediately is access: the customer keeps it until `ends_at`, the date their last paid period ends.
Treating cancellation as instant loss of access is the mistake this app's docs call out explicitly.

### 4. `order-invoice`'s billing fields are query parameters, not a JSON body

Every other write in this app sends a JSON:API `{ data: { attributes } }` body. `POST
/v1/orders/:id/generate-invoice` is the one exception — the vendor's own curl example appends
`?name=...&address=...&city=...` to the URL and sends **no** `-d` payload at all. `actions/
order-invoice.ts` follows that shape rather than "fixing" it into a body nobody asked for. The docs
also carry a live deprecation notice that `name`/`address`/`city`/`zip_code`/`country` will soon
become required (`state` already is, for US/CA) — they are already marked required here.

### 5. A webhook's `secret` can never be read back

`webhook-create`'s own docs: "The `secret` is never returned in the API. To view the secret of a
webhook, open the webhook in your dashboard." Store it yourself at creation time — there is no
`webhook-get` response field that will ever contain it again.

## Auth

One method: **API Key**, sent as `Authorization: Bearer <api_key>`. Create one at **Lemon Squeezy
> Settings > API**. Keys are valid for one year and can be created in either Live or Test mode —
both call the same host (see finding 2 above).

The auth probe is `GET /v1/users/me` — the vendor's own "Authenticated request example" in the docs.
It needs a credential (confirmed live: no `Authorization` header and a bogus bearer token both
answer a real `401 Unauthenticated`, never a `200` with an error body) and needs no scoped
permission, since Lemon Squeezy API keys carry no granular permission model to lack. The response is
the caller's own account profile (name, email, avatar) — never the credential itself.

`afterConnect` publishes the account's `name`/`email` (for the connection label) and whether the key
is a Test-mode or Live-mode key (`testMode`), read from the same call's `meta.test_mode`.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `user-get` | read | `GET /v1/users/me` |
| `store-list` | search | `GET /v1/stores` |
| `store-get` | read | `GET /v1/stores/{id}` |
| `product-list` | search | `GET /v1/products` |
| `product-get` | read | `GET /v1/products/{id}` |
| `variant-list` | search | `GET /v1/variants` |
| `variant-get` | read | `GET /v1/variants/{id}` |
| `price-list` | search | `GET /v1/prices` |
| `price-get` | read | `GET /v1/prices/{id}` |
| `customer-list` | search | `GET /v1/customers` |
| `customer-get` | read | `GET /v1/customers/{id}` |
| `customer-create` | perform | `POST /v1/customers` |
| `customer-update` | perform | `PATCH /v1/customers/{id}` |
| `order-list` | search | `GET /v1/orders` |
| `order-get` | read | `GET /v1/orders/{id}` |
| `order-invoice` | perform | `POST /v1/orders/{id}/generate-invoice` |
| `order-refund` | perform | `POST /v1/orders/{id}/refund` |
| `subscription-list` | search | `GET /v1/subscriptions` |
| `subscription-get` | read | `GET /v1/subscriptions/{id}` |
| `subscription-update` | perform | `PATCH /v1/subscriptions/{id}` |
| `subscription-cancel` | perform | `DELETE /v1/subscriptions/{id}` |
| `discount-list` | search | `GET /v1/discounts` |
| `discount-get` | read | `GET /v1/discounts/{id}` |
| `discount-create` | perform | `POST /v1/discounts` |
| `discount-delete` | perform | `DELETE /v1/discounts/{id}` |
| `license-key-list` | search | `GET /v1/license-keys` |
| `license-key-get` | read | `GET /v1/license-keys/{id}` |
| `license-key-update` | perform | `PATCH /v1/license-keys/{id}` |
| `webhook-list` | search | `GET /v1/webhooks` |
| `webhook-get` | read | `GET /v1/webhooks/{id}` |
| `webhook-create` | perform | `POST /v1/webhooks` |
| `webhook-update` | perform | `PATCH /v1/webhooks/{id}` |
| `webhook-delete` | perform | `DELETE /v1/webhooks/{id}` |
| `checkout-list` | search | `GET /v1/checkouts` |
| `checkout-get` | read | `GET /v1/checkouts/{id}` |
| `checkout-create` | perform | `POST /v1/checkouts` |

### Notes on individual actions

**Orders cannot be created through this API.** An order is the result of a customer completing a
checkout; this app reads and refunds them (`order-refund`) instead of creating them. Building a new
checkout/transaction is what `checkout-create` is for.

**`order-refund`** has no idempotency key on the vendor's side, so retrying a call that already
succeeded either double-refunds (a partial amount) or fails against an already-refunded order (a
full one) — it is marked `idempotent: false` for that reason.

**`subscription-update`** is a no-op for PayPal-collected subscriptions — the vendor's own note: the
call succeeds but changes nothing, and the response's
`data.attributes.urls.customer_portal_update_subscription` is where the customer must be redirected
instead to make the change themselves.

**`checkout-create`** exposes the common `product_options`/`checkout_options`/`checkout_data`
fields (redirect URL, prefill email/name, discount code, embed, locale) as real params, plus a
`*Json` escape hatch per object for the rest of Lemon Squeezy's 20+ documented sub-fields (colors,
media, receipt copy, billing address prefill, quantity lists). A structured param always wins over
the raw JSON when both name the same key — `tests/actions/checkouts.test.ts` pins that ordering.

**Update actions send only the fields you filled in.** Every write is `PATCH` and applies exactly
the attributes present in the body — `lib/client.ts`'s `compact` drops unset (`undefined`/`""`)
keys while deliberately keeping `null`, `false` and `0`, since Lemon Squeezy uses all three as real
values (`pause: null` to unpause a subscription, `disabled: false`, `activation_limit: 0`).

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | (default `degraded`) | Reads `status.lemonsqueezy.com`'s RSS incident feed |
| `quota` | quota | connection | (default `degraded`) | Reads `X-Ratelimit-Limit`/`X-Ratelimit-Remaining` off a signed `GET /v1/users/me` |
| `auth:api-key` | — | connection | — | Derived from `Auth.test` automatically |

### The status page is Oh Dear, not Statuspage or Instatus

`status.lemonsqueezy.com` answers `200` with a real page — "No problems detected. | Lemon Squeezy
Status" — but every Statuspage/Instatus-shaped path (`/api/v2/summary.json`, `/history.atom`,
`/index.json`) 404s with a small, uniform Varnish error body. The page's own favicon and footer
link name the real platform: **Oh Dear** (`ohdear.app`), whose status pages publish a plain RSS
feed at `/rss` — confirmed live (`200`, `application/rss+xml`). The obvious alternative,
`lemonsqueezy.statuspage.io/api/v2/summary.json`, 302-redirects to `statuspage.io`'s own marketing
root — the standard signature of an **unclaimed** page — so it is not the real one.

Declared with `feed: { url }` rather than hand-parsed, per this pack's convention: the host fetches
and parses the RSS, and the hook only interprets what an entry means. **Caveat stated rather than
hidden:** at the time of writing the feed carries zero items — nothing has ever been posted to it —
so the vendor's own open/resolved title convention could not be observed on the wire. The check
treats a title lacking a resolved/complete/operational marker as still open, the same reading
`apps/ghost` uses for its incident.io feed; `health/service.ts` documents this as a best-effort
convention, not a confirmed one.

### `quota` reads a real, documented rate-limit header — with one caveat

Lemon Squeezy documents a flat **300 API calls per minute** ceiling and states plainly that
`X-Ratelimit-Limit` / `X-Ratelimit-Remaining` ride on every *successful* response. This app was
built without a live API key, so that header pair could not be confirmed on an authenticated
response — an unauthenticated probe against `/v1/users/me` carries neither header, which is
consistent with the docs (they ride only on success) but is not the same as having seen them. If a
live account's headers differ in name or casing, the check degrades to `unknown` rather than
misreporting, since a missing pair is read as "not present," never as "zero remaining."

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **License API** (`activate-license-key`, `deactivate-license-key`, `validate-license-key`) | A *separate*, unauthenticated API meant for the licensed software itself to call at runtime — it takes the license key in the request body, not the store owner's API key, and has nothing to do with managing a store. A distinct app (or trigger surface) is the right home for it. |
| **Files, Order Items, Subscription Invoices, Subscription Items, Usage Records** | Real, mostly read-only resources reachable via `include=` on their parent (a variant's files, an order's items) or their own list/get pair. Left out of this first pass to keep it reviewable; usage-based billing (Usage Records) deserves its own pass given how central metered pricing is to a "digital products" platform. |
| **Discount Redemptions, Affiliates** | Read-only reporting surfaces with no write endpoints of their own. |
| **Prices: create/update** | Lemon Squeezy has no such endpoint — a new price object is created automatically whenever a variant's price changes in the dashboard, and old prices are retained for historical orders/subscriptions. |
| **Order creation** | Orders are the result of a completed checkout, not a directly creatable resource — see `checkout-create`. |

## Icon

`assets/icon.svg` is **Lemon Squeezy's own mark**, taken verbatim from
[simple-icons](https://simpleicons.org/):

```
https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/lemonsqueezy.svg
```

`assets/icon.dark.svg` is the same path recolored for legibility on a dark tile, generated by this
pack's own `_tools/icon-legibility.ts fix` (the vendor mark's default black fill has a contrast
ratio too low against the dark theme's background). The path data itself is unmodified in both
files. Run `deno task fmt`, never bare `deno fmt` — the latter reformats `assets/` and would rewrite
the vendor path.

## Layout

```
lemonsqueezy/
├── index.ts                  # AppDefinition: 36 actions, 1 auth, 2 health checks
├── lib/client.ts             # JSON:API envelope/query/error handling, relationship helpers
├── lib/params.ts             # shared Param fragments, pagination, and the vendor's enums
├── auth/api-key.ts           # bearer credential, /users/me probe, name/email/testMode display
├── actions/                  # one file per action
├── health/                   # service (Oh Dear RSS feed) + quota (signed rate-limit headers)
└── tests/                    # 106 unit tests against a mocked HookContext
```

## Development

```bash
deno task test       # 106 unit tests
deno task check      # typecheck
deno task lint
deno task validate   # @w6w/validator manifest checks
deno task fmt        # NEVER bare `deno fmt` — it rewrites assets/*.svg
```
