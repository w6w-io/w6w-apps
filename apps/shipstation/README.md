# ShipStation

Create shipments, get carrier rates, buy and void labels, and manage warehouses
and carrier accounts — across every carrier connected to a ShipStation account.

- **Categories** — commerce, developer-tools
- **Auth methods** — api-key
- **Actions** — 18
- **Egress allowlist** — `api.shipstation.com` (the `service` health check adds
  `status.shipstation.com`)
- **Website** — https://www.shipstation.com
- **API docs** — https://docs.shipstation.com

> **On categories.** Shipping has no slug in the controlled vocabulary
> (`core/rfcs/categories.md`), so this app is filed under `commerce` and
> `developer-tools`, the same choice EasyPost made.

## There are two live APIs here, and this app uses only one of them

`docs.shipstation.com` documents **both** a legacy ShipStation **V1** API and
the current ShipStation **V2** API, at the same host (`api.shipstation.com`)
but under different key sets and different terminology. ShipStation's own
authentication page states plainly: *"The V1 API is deprecated and will be
removed in the future."* This app is built entirely against **V2**.

`docs.shipstation.com/apis/shipengine/*` documents a third, related surface —
the sibling **ShipEngine** product on host `api.shipengine.com`. It shares
request/response shapes and even the literal `"error_source": "shipengine"` in
every error body (ShipStation V2 runs on the ShipEngine platform under the
hood), but it is a **different host** this app never calls. Those pages were
read only as schema reference where the ShipStation-branded pages were thin —
confirmed by probing `api.shipstation.com` live and getting the same error
shapes described there.

## "Order" does not mean order, and "shipment" does not mean shipment

This is the single most disorienting fact about the V2 API — spelled out on
`docs.shipstation.com/orders/understanding-orders-shipments`:

| ShipStation UI / V1 term | V2 API term | What it actually is |
|---|---|---|
| Order | **Shipment** | The intent to ship — addresses, packages, carrier/service |
| Shipment | **Label** | A purchased shipping label — tracking number, cost, files |

Every action in this app uses the **V2** nouns (`shipment-*`, `label-*`), with
the V1/UI mapping called out in each action's own description — a workflow
author who wants "create an order" wants `shipment-create`, and one who wants
the V1-sense "shipment info" wants a `label-*` action.

There is also a genuine, separate **Sales Order** concept
(`/v-beta/sales_orders`, importing from connected marketplaces like Shopify or
Amazon) documented under `apis/shipengine/docs/sales-orders/`. It is **not**
implemented here, for two independently sufficient reasons verified in the
docs: it is gated to "the Advanced plan or higher", and it lives at a `v-beta`
path the vendor has never promoted to `v2`. Building a first-party app against
a surface most accounts cannot reach, on a path the vendor has not committed
to stabilizing, is exactly the kind of thing this pack leaves out and says so.

## Setup

### API Key

ShipStation account → **Settings → Account → API Settings → V2 API Key**. Sent
as a plain `API-Key` request header — no `Bearer`/`Basic` scheme. **This is not
the same key as the deprecated V1 API** — V1 and V2 keys are issued and
validated completely separately, and a V1 key sent here is rejected exactly
like a wrong V2 key.

Sandbox keys work too, but are rate-limited to 20 requests/minute instead of
200 (see *Rate limits* below).

### Missing and invalid keys read identically

Measured live 2026-08-25: `GET /v2/labels` with **no** `API-Key` header at all,
and the same call with a syntactically valid but **wrong** key, both answer
`401` with the exact same body:

```json
{"errors":[{"error_code":"unauthorized","error_type":"security","error_source":"shipengine","message":"Access denied."}]}
```

`auth/api-key.ts`'s `test` hook can say the key was rejected; it cannot say
whether a key was sent at all.

## Label creation is three endpoints, not one

Verified against `docs.shipstation.com/create-labels` — ShipStation exposes
label purchase as **three separate URLs**, not one endpoint with optional body
fields:

| You have | Endpoint |
|---|---|
| Nothing yet | `POST /v2/labels` — full inline shipment details |
| A `rate_id` (from `rate-get`) | `POST /v2/labels/rates/{rate_id}` |
| A `shipment_id` (from `shipment-create`) | `POST /v2/labels/shipment/{shipment_id}` |

`label-create` picks the right one from whichever id you supply, so it reads
as one action even though it calls one of three routes underneath.

## `rate-get` is a "read" with a side effect

Per `docs.shipstation.com/retrieve-rates`, ShipStation **stores** the inline
shipment details you send to `POST /v2/rates` as a real shipment record and
returns its `shipment_id` alongside the quotes — a "just get me a price" call
silently creates a persistent shipment that will later show up in
`shipment-list`. That's why `rate-get` is `perform`/non-idempotent rather than
`read`, and why `shipmentId` is a top-level output rather than buried in the
response.

The full response shape is also worth flagging: it is
`{ rate_response: { rates, invalid_rates, status }, shipment_id, ...the
created shipment's own fields at the top level }` — **not** the flat
`{ rates: [...] }` shape the docs' own abbreviated single-rate examples show
elsewhere on the same site. An implementation built only from those examples
would read `result.rates` and get `undefined`.

## `shipment-cancel` is a `GET`

`GET /v2/shipments/{shipment_id}/cancel` — a mutation sent as `GET`, not `POST`
or `DELETE`. Confirmed both in the docs' own sample request and live (the path
answers `401` unauthenticated rather than `404`/`405`, so the route genuinely
exists at that method). A client built by pattern-matching this app's other
mutations onto `POST` gets a `404`.

## Actions

| Key | Type | Description |
|---|---|---|
| `shipment-create` | perform | Describe what you're shipping — the V1/UI "order". Buys nothing |
| `shipment-get` | read | One shipment, by id or your own external id |
| `shipment-list` | search | Filtered, paged list of shipments |
| `shipment-update` | perform | Replace a shipment's details before a label is bought |
| `shipment-cancel` | perform | Cancel a shipment (uses `GET`, not `POST`) |
| `rate-get` | perform | Quote carriers for a shipment — **also creates a shipment record** |
| `rate-list-for-shipment` | read | Rates already calculated for a shipment, no side effect |
| `label-create` | perform | **Buy a label** — from a rate, a shipment, or inline details |
| `label-get` | read | One purchased label |
| `label-list` | search | Filtered, paged list of purchased labels |
| `label-void` | perform | Void a label and (carrier permitting) get a refund |
| `carrier-list` | read | Every connected carrier account |
| `carrier-get` | read | One carrier's services, package types, and options |
| `warehouse-list` | read | Every shipping (origin/return) warehouse on the account |
| `warehouse-create` | perform | Create a shipping warehouse |
| `tag-create` | perform | Pre-create a reusable shipment tag |
| `tag-list` | read | Every tag name on the account |
| `shipment-tag-add` | perform | Tag a shipment; creates the tag if it's new |

`shipment-create`, `rate-get`, `label-create`, and `warehouse-create` are the
only non-idempotent actions — everything else is either read-only or safe to
retry (a full-replace `PUT`, a cancel/void that lands in the same end state, or
a tag whose identity *is* its name).

## Health checks

### `service` — the real component, not the whole page

`status.shipstation.com` is a genuine, claimed Statuspage instance
(`page.name` = `"ShipStation"`, 34 components as of 2026-08-25). It separates
**`Companion API V2`** from **`Companion API V1`** as distinct components in a
`ShipStation Companion API` group — this check follows `Companion API V2`
alone, because folding in V1 would fail this app's health on an outage of an
API it never calls.

A `Carriers` group (14 members as of writing — Stamps.com, FedEx, UPS, DHL
Express, DHL eCommerce, Canada Post, Australia Post, Royal Mail, Purolator,
Parcelforce, DPD, Endicia, Express 1, Amazon Buy Shipping API) is reported **by
name** when degraded, but never worsens the verdict — a dead carrier means you
can't rate/label with *that* carrier, not that ShipStation's API is down.

### `account` — does this connection have anything to ship with?

A valid key with **zero connected carrier accounts** answers every rate/label
request with a plain validation error, not an auth error — indistinguishable
from a typo in a service code unless you already know to check. This
connection-scoped check reuses the same `GET /v2/carriers` call the `test`
hook makes, reports `degraded` when nothing is connected, and also flags a
"walleted" (prepaid) carrier like Stamps.com sitting at a zero balance, since
its next label purchase will fail.

### `quota` — declared absent, deliberately

Verified 2026-08-25 against `docs.shipstation.com/rate-limits`: **200
requests/minute** in production, **20/minute** in Sandbox — a per-minute burst
ceiling, not a metered quota with a balance. There is no usage endpoint, and a
live probe of an ordinary response carried **no `X-RateLimit-*` header at
all** (only `date`, `content-type`, `x-shipengine-requestid`, and security
headers). `Retry-After` is documented only on the `429` itself, which
`lib/client.ts#describeError` surfaces on the call that actually hits the
limit. `severity: "informational"` — an `unavailable` check always reports
`unknown`, never worsening the roll-up on its own.

## What this app deliberately does not do

- **No Sales Order API** (`/v-beta/sales_orders`) — plan-gated (Advanced+) and
  still `v-beta`. See *"Order" does not mean order* above.
- **No Rate Shopper / Shipping Rules automatic label creation** — these
  configure *automatic* carrier selection via dashboard-defined rules/
  strategies rather than a single documented request/response an action can
  wrap cleanly; `rate-get` + `label-create` cover the explicit, inspectable
  path to the same outcome.
- **No batches, manifests, or inventory warehouses** — real ShipStation V2
  features, left out of this first pass to keep the surface at "fulfillment
  core" (shipments, rates, labels, carriers, warehouses, tags) rather than
  every endpoint the vendor publishes. Not implemented, not aliased to
  something else — genuinely absent.

## Errors

Every error body is `{"request_id", "errors":[{"error_source","error_type",
"error_code","message","field_name"?,"field_value"?}]}` — verified live against
an unauthenticated `GET /v2/labels`. `error_source` says who to blame
(`shipengine` itself, vs. a third party like a `carrier`); `lib/client.ts`
keeps it in every thrown error message because a carrier-sourced failure often
means "call the carrier", not "fix the request".
