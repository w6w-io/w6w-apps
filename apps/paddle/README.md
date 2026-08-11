# Paddle

Catalog products and prices, customers, subscriptions, transactions, invoice PDFs and refunds on the
**Paddle Billing** REST API.

- **Categories** — commerce, finance
- **Auth methods** — api-key
- **Actions** — 21
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.paddle.com`, `sandbox-api.paddle.com`
- **Website** — https://www.paddle.com/
- **API docs** — https://developer.paddle.com/api-reference/overview
- **Status page** — https://paddlestatus.com/

Paddle is a merchant of record: it sells your software on your behalf, and handles the payment, the
sales tax and the invoice. That makes its API the system of record for *what a customer is paying
you* — so this app's centre of gravity is the subscription lifecycle and the money attached to it.

> **Everything below was verified against Paddle's own sources on 2026-08-10** — the developer
> documentation fetched as machine-readable Markdown from
> [`developer.paddle.com/llms/api-reference.txt`](https://developer.paddle.com/llms/api-reference.txt)
> and the per-endpoint `.md` pages it indexes, plus live probes against `api.paddle.com` and
> `sandbox-api.paddle.com`. Nothing here came from a third-party integration directory.

## The five things most likely to go wrong

### 1. This is Paddle **Billing**, not Paddle Classic

Two incompatible generations of API share the brand:

| | Paddle Billing (this app) | Paddle Classic |
| --- | --- | --- |
| Host | `api.paddle.com` | `vendors.paddle.com/api/2.0/…` |
| Auth | `Authorization: Bearer pdl_…` | `vendor_id` + `vendor_auth_code`, form-encoded |
| Envelope | `{ data, meta }` | `{ success, response }` |
| Ids | `pro_`, `pri_`, `ctm_`, `sub_`, `txn_` | plain integers |

A Classic credential cannot authenticate a Billing request. `auth/api-key.ts` recognises one and
says so by name rather than letting it fail as an opaque 403. **n8n's Paddle node is Classic**, so it
is not a reference for anything in this app.

### 2. The API key decides which environment — and therefore which host

| Environment | Host | Key prefix |
| --- | --- | --- |
| Live | `api.paddle.com` | `pdl_live_apikey_…` |
| Sandbox | `sandbox-api.paddle.com` | `pdl_sdbx_apikey_…` |

There is no environment field to fill in. The `sign` hook — the only code that ever holds the
credential — reads the prefix and rewrites the request host, the same way `apps/mailchimp` derives
its datacenter from the key suffix. Asking the user to *also* pick an environment would only create a
way for the two to disagree.

Keys created before **6 May 2025** are "legacy": 50 lowercase characters, no prefix, no environment
marker. Paddle's guidance is to revoke and replace them; this app detects one and says exactly that.

### 3. Cancel and pause **schedule** the change; the status stays `active`

This is the single most common way to write a broken Paddle workflow:

```
POST /subscriptions/sub_…/cancel     → 200, status: "active", scheduled_change: { action: "cancel" }
```

By default both cancel and pause write a `scheduled_change` for the end of the current billing
period. The subscription keeps the status `active` until the effective date. A step that cancels and
then asserts `status === "canceled"` fails against a completely successful call. Pass
`effective_from: immediately` when you mean now.

Two exceptions worth knowing: cancelling an already-`paused` subscription happens immediately
regardless, and **you cannot reinstate a canceled subscription** — the customer has to subscribe
again.

Resuming is different again: `effective_from` there accepts *either* `immediately` *or an RFC 3339
datetime*, and resuming normally charges the full amount right away.

### 4. Amounts are integer **strings** in the currency's lowest denomination

`unit_price.amount` for $10.00 is `"1000"` — not `10`, not `"10.00"`. Paddle's own words: "Although
represented as a string, this value must be a valid integer." The `amount` param is typed `string`
with an integer pattern for exactly this reason; a `number` param would let a decimal through and be
wrong by two orders of magnitude. `tests/actions/catalog.test.ts` pins the wire format.

### 5. Page sizes are not uniform

| Endpoint | Default | Maximum |
| --- | --- | --- |
| Products, prices, customers, subscriptions | 50 | 200 |
| **Transactions** | **30** | **30** |
| **Adjustments** | **10** | **50** |

Transactions cannot be paged wider than 30, so a report over a busy month is many requests against a
240-per-minute limit. Every list action returns Paddle's full `{ data, meta }` envelope rather than a
bare array, so `meta.pagination.next` and `has_more` survive and a workflow can actually fetch page
two.

## Auth

One method: **API key**, sent as `Authorization: Bearer pdl_…`. Create one at
**Paddle > Developer tools > Authentication > API keys**.

Paddle keys carry **granular permissions** (`product.read`, `subscription.write`, …) chosen at
creation, and a request outside them returns `403 forbidden`. Grant a key only what the connection
needs. Keys also **expire** — 90 days by default, one year maximum.

### The probe is `GET /event-types`, and it was chosen by measurement

Three things were checked on the wire on 2026-08-10:

| Endpoint | No auth header | Needs a permission? | Returns account data? |
| --- | --- | --- | --- |
| `GET /event-types` | **403 `authentication_missing`** | **no** | **no** — a static list of webhook event names |
| `GET /ips` | **200** ⚠️ | no | no |
| `GET /products` | 403 `forbidden` | yes (`product.read`) | yes |

`/ips` is the trap: it answers **200 with no credential at all**, so a Connection whose credential
never got attached would sail past a probe against it. `/products` is the other trap: a correctly
scoped subscription-only key would be reported as broken. `/event-types` is the only endpoint that
requires a credential, requires no permission, and reveals nothing about the account —
`tests/index.test.ts` pins both the choice and the rejection.

Paddle Billing has no whoami endpoint, so `afterConnect` publishes only the environment
(`live`/`sandbox`) and the host. That is also the useful thing to see in a list of Connections.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `product-list` | search | `GET /products` |
| `product-get` | read | `GET /products/{id}` |
| `product-create` | perform | `POST /products` |
| `product-update` | perform | `PATCH /products/{id}` |
| `price-list` | search | `GET /prices` |
| `price-get` | read | `GET /prices/{id}` |
| `price-create` | perform | `POST /prices` |
| `customer-list` | search | `GET /customers` |
| `customer-get` | read | `GET /customers/{id}` |
| `customer-create` | perform | `POST /customers` |
| `customer-update` | perform | `PATCH /customers/{id}` |
| `subscription-list` | search | `GET /subscriptions` |
| `subscription-get` | read | `GET /subscriptions/{id}` |
| `subscription-cancel` | perform | `POST /subscriptions/{id}/cancel` |
| `subscription-pause` | perform | `POST /subscriptions/{id}/pause` |
| `subscription-resume` | perform | `POST /subscriptions/{id}/resume` |
| `transaction-list` | search | `GET /transactions` |
| `transaction-get` | read | `GET /transactions/{id}` |
| `transaction-invoice` | read | `GET /transactions/{id}/invoice` |
| `adjustment-list` | search | `GET /adjustments` |
| `adjustment-create` | perform | `POST /adjustments` |

### Notes on individual actions

**`adjustment-create`** is the one that moves money, and it has four sharp edges, all Paddle's:
a live refund is usually created as `pending_approval` and waits for a Paddle reviewer (sandbox
auto-approves every ten minutes); `refund` works only on `completed` transactions while `credit`
works only on manually-collected `billed`/`past_due` ones; the default `type` is `partial`, which
*requires* an `items` array of `txnitm_…` ids; and there is no idempotency key, so running it twice
creates two refunds. It is marked `idempotent: false` for that last reason.

**`transaction-invoice`** returns a **link**, not a PDF, and the link **expires after one hour**.
Download it in the same run.

**`subscription-list`** has no default status filter — unlike products, prices and customers, it
returns canceled subscriptions alongside active ones unless you filter. Note also that a
subscription pending cancellation still reads `active`; `scheduled_change_action` is how to find it.

**Update actions send only the fields you filled in.** Paddle's updates are `PATCH` and apply exactly
the keys present, so an untouched field must not appear in the body — `lib/client.ts`'s `compact`
drops unset keys while deliberately keeping `false` and `0`.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | (default `degraded`) | Reads `paddlestatus.com/api/v2/summary.json` |
| `quota` | quota | app | informational | Declared `unavailable` — Paddle publishes no readable headroom |
| `auth:api-key` | — | connection | — | Derived from `Auth.test` automatically |

### The status page is real — checked three ways

`paddlestatus.com` is the host Paddle's own error documentation links by name. It is an
**incident.io** page serving a Statuspage-v2-compatible API.

| Path | Status | Bytes | md5 (first 12) |
| --- | --- | --- | --- |
| `/api/v2/summary.json` | 200 | 6,523 | `1e886c148ec8` |
| `/api/v2/status.json` | 200 | 201 | `d4d8956949b2` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |

Three different answers, so it is not a catch-all; the body is `application/json` parsing as the
Statuspage v2 schema, matching neither the ~127,700-byte unclaimed-`statuspage.io` signature nor the
~216,800-byte unclaimed-`instatus.com` one; and it self-identifies —
`page.name: "Paddle"`, `page.url: "https://paddlestatus.com/"`, with components named
`Production - Billing`, `Sandbox - Billing`, `Production - Classic`, `Sandbox - Classic`.

Two findings shaped the implementation:

- **Component names are not unique.** The page is a grid — each service publishes one component per
  environment — and the JSON carries no group field, so three separate components are all literally
  named `Production - Billing`. Keying components by a slug of the name (which the sibling `metabase`
  and `discourse` checks do) would collapse 25 components into 8 and let a healthy row overwrite a
  broken one. This check keys by the vendor's component **id** and puts the name in the message.
- **There is no `incidents` key.** incident.io omits it entirely rather than sending `[]`, so
  `body.incidents.length` would throw against the live page. Every access is optional.

Unlike `apps/metabase`, this check keeps the `degraded` default for its kind rather than dropping to
`informational`: there is no self-hosted Paddle, so every Connection runs on exactly the
infrastructure this page describes.

### Why `quota` is unavailable

A live response from `api.paddle.com` carries no `RateLimit-*`, no `X-RateLimit-*` and no remaining
count — verified by reading the full header set on 2026-08-10. Paddle's rate-limiting page documents
fixed ceilings enforced by refusal: **240 requests/minute per IP** (1,000/minute for the two preview
endpoints), plus **20 chargeable subscription updates per hour and 100 per day per account**. The
per-IP limits are also shared across every tenant behind the same egress address, so even a reading
would not describe one connection's share.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Transactions: create, update, preview, revise** | Creating a transaction is building a checkout, and it needs the full line-item, discount, billing-details and collection-mode model. Worth its own pass rather than a thin version of it. |
| **Subscription update / charge / previews** | `PATCH /subscriptions/{id}` is the proration surface — `proration_billing_mode` alone changes whether a customer is charged immediately, and it has its own rate limit (20/hour). Pause, resume and cancel cover the lifecycle safely; upgrades deserve deliberate design. |
| **Discounts, discount groups, addresses, businesses, payment methods** | Real, straightforward CRUD. Left out to keep this first pass at a reviewable size. |
| **Notification settings, notifications, simulations, notification logs** | Webhook configuration belongs to a trigger surface, not an action surface. |
| **Reports, metrics** | `POST /reports` is an async job — create, poll, then fetch a CSV — which needs a polling design, not a single action. |
| **Client-side tokens, customer portal sessions, checkout domains** | Front-end and account-configuration concerns rather than workflow steps. |
| **Paddle Classic (`vendors.paddle.com`)** | A different API for a legacy product. Would be a separate app if it is ever wanted. |

## Icon

`assets/icon.svg` is **Paddle's own mark**, not a drawing. n8n's `nodes-base` carries only a
low-resolution `paddle.png` (849 bytes) for its Classic node, so the SVG was taken verbatim from
[simple-icons](https://simpleicons.org/), which sources marks from vendors' own brand assets:

```
https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/paddle.svg
```

The path data is unmodified. Run `deno task fmt`, never bare `deno fmt` — the latter reformats
`assets/` and would rewrite the vendor path.

## Layout

```
paddle/
├── index.ts                  # AppDefinition: 21 actions, 1 auth, 2 health checks
├── lib/client.ts             # host resolution, envelopes, comma-joined query, error taxonomy
├── lib/params.ts             # shared Param fragments and the vendor's enums
├── auth/api-key.ts           # bearer + host-from-key, key-shape diagnosis, /event-types probe
├── actions/                  # one file per action
├── health/                   # service (paddlestatus.com) + quota (unavailable)
└── tests/                    # 102 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 102 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
