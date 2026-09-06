# Booqable

Manage Booqable rental orders, customers, products and stock.

- **Categories** — crm, commerce
- **Auth methods** — bearer (Access Token)
- **Actions** — 26
- **Egress allowlist** — `*.booqable.com`
- **Website** — https://booqable.com
- **API docs** — https://developers.booqable.com/ ("Booqable API v4")

## Icon

`https://booqable.com/logo.svg` (confirmed reachable, ~76KB) is not a vector mark: it is a 1024×1024
JPEG raster — Booqable's actual boomerang glyph on an opaque white square — wrapped in a one-`<image>`
SVG shell. It's the icon glyph alone (no wordmark to crop out), so it was cropped to its ink
(`convert -fuzz 10% -transparent white -trim`) and re-embedded as a transparent PNG, then run through
`_tools/icon-normalize.ts` to center/scale it into the pack's `0 0 100 100` convention, same as any
vector mark. Because the mark is a solid-black raster (no `fill` a `<style>`/attribute could recolor),
`_tools/icon-legibility.ts` scores it as "no inks found — not scored" and would silently pass a dark
tile it is actually invisible on — confirmed by rendering both tiles directly, not just trusting the
audit's silence. `assets/icon.dark.svg` is therefore a hand-authored variant: the same glyph composed
on a white rounded plate (the convention `apps/customer.io` uses for its own icon), declared via
`appearance.darkMode.icon`. The identical plate was tried for the LIGHT icon too and rejected: `icon-
legibility.ts check` failed it (ΔE 5.04 against the light tile `#f0f2f6` — a white plate barely reads
against a near-white tile), so the light variant stays the plain mark on a transparent background,
where a plate isn't needed.

## Auth scheme, and the host model

Booqable is **per-company**, not a shared gateway: "All API requests need to be directed to the
correct company-specific endpoint. The format is as follows:
`https://{company_slug}.booqable.com/api/4/`" — verified against every worked example in the docs,
which all use `https://example.booqable.com/api/4/...`. The company slug is therefore collected as
an Auth field (`companySlug`) rather than an Action param, exactly the pattern `apps/freshdesk` and
`apps/gorgias` use for their own per-account hosts; `w6w.network.allow` is the wildcard
`*.booqable.com`, not a fixed host.

Auth is a plain **Access Token** sent as `Authorization: Bearer <token>` — the scheme every worked
`curl` example in the docs actually uses. Booqable's docs also describe a second, "Request signing"
scheme: a client-generated, single-use JWT (ES256/RS256/HS256) good for exactly one request. That is
**not implemented here** — it needs signing logic no `sign` hook (network-less, one credential
object in, one request out) could run, and Booqable's own docs treat it as the advanced/optional
path; a user who wants it can still generate a plain Access Token from the same
Account Settings → Authentication methods screen.

## Products are a two-level model — read this before calling `product-*`

Booqable's catalog is not "one row per rentable item". A **ProductGroup** holds the shared name,
pricing configuration and tracking type; each **Product** underneath it is one rentable *variant* —
even a group with no real variations (no colors/sizes) still has exactly one `Product` record. The
docs' own worked "Create a product" example sets only `product_group_id` and `variation_values`,
never a name or price — those live on the group. Concretely:

1. Create (or already have) a **ProductGroup** — `product-group-create` — with the name, tracking
   type (`none`/`trackable`/`bulk`), product type (`rental`/`sales_item`/`service`) and pricing.
2. Create the **Product** variant under it — `product-create` — passing `productGroupId` (required)
   and, if the group has variations enabled, `variationValues` (positional, matching the group's own
   `variation_fields`).

Skipping step 1 and guessing a `product_group_id` is the single easiest way to lose a day here.

## `DELETE` on a customer/product is a soft archive, not a hard delete

`DELETE /customers/{id}` and `DELETE /products/{id}` both answer **200**, not 204, with the full
resource body and `archived: true` / `archived_at` set — verified against the docs' own "Archive a
customer" / "Archive a product" worked examples. `customer-archive`/`product-archive` are modeled as
`perform` (not a destructive delete) for exactly this reason, and both are idempotent: re-archiving
an already-archived record returns the same 200 body rather than erroring.

## Moving an order through its lifecycle needs `order_status_transitions`, not `PUT`

An order's status (`new` → `draft` → `reserved` → `started` → `stopped`, or `archived`/`canceled`)
is **not** an attribute you `PUT`. It moves through `POST /order_status_transitions`
(`order-status-transition`), which names both `transition_from` and `transition_to` explicitly. The
docs are explicit that `transition_to: "started"`/`"stopped"` is only reachable directly in
combination with `revert: true` — normal start/stop instead happens through `OrderFulfillment` as
items are actually picked up/returned, which is out of scope here. Reserving an order that would
create a shortage answers a structured `422`:

- `errors[0].code: "items_not_available"` with a non-empty `meta.warning` (and empty `meta.blocking`)
  is a **warning** — retry the same transition with `confirmShortage: true` to proceed anyway.
- `errors[0].code: "stock_item_specified"` (or `items_not_available` with a non-empty
  `meta.blocking`) is a **hard conflict** — a specific stock item is already committed elsewhere, and
  cannot be overridden by `confirmShortage`.

## This is JSON:API, and the error shape follows from it

"The Booqable API supports two response types `jsonapi` and `json`. By default, the API returns
`jsonapi` responses" — this app always uses the default: `{ data: { id, type, attributes,
relationships }, meta }` for a single resource, and write bodies are
`{ data: { type, attributes, id? } }` (`lib/client.ts`'s `jsonApiBody`). Unlike some JSON:API
vendors, Booqable's own create/update examples put related-record ids **directly in `attributes`**
(`customer_id`, `product_group_id`, `tax_region_id`, …), never under a `relationships` object — so
`jsonApiBody` here carries no `relationships` parameter, unlike `apps/lemonsqueezy`'s equivalent.

Errors are `{ "errors": [ { "code", "status", "title", "detail", "meta" } ] }`, confirmed against
several documented 422 examples (shortage, wrong status, stock item conflicts). `lib/client.ts`
reads `errors[0].title`/`.detail` rather than trusting the bare HTTP status.

## Filtering, sideloading, pagination and "advanced search"

List and search endpoints share one documented parameter set: `page[number]`/`page[size]` for
pagination, `filter[attribute][operator]` for filtering (`eq`, `not_eq`, `gt`, `gte`, `lt`, `lte`,
`prefix`, `suffix`, `match`, … depending on the field's type — each resource's own Filters table in
the docs lists which operators its fields accept), `include` for JSON:API sideloading, and `sort`
(comma-separated, `-` prefix for descending). Every `*-list` action exposes these as a generic
`filter` JSON param (flattened by `lib/params.ts`'s `flattenFilter`) rather than one Param per
filterable field, since the filterable set differs per resource and can run to 30+ fields (orders).

A `search` endpoint (`POST /{resource}/search`) additionally accepts Booqable's **"advanced
search"** — an arbitrary nested `{ operator: "and"|"or", attributes: [...] }` boolean tree — as its
`filter` body key, verified against the docs' worked `customers/search` example. `customer-search`,
`product-search` and `order-search` accept this directly (unflattened) as their `filter` param.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential's company* reachable, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.booqable.com>, an Atlassian Statuspage instance. Verified live
2026-09-06: `page.name` is `"Booqable"` (not just a 200), and `/history.atom` is a real,
currently-maintained Atom feed. Read via the spec's `feed` mechanism (`health/service.ts`) rather
than hand-parsed. The page's components are "Web application" (showcase), "Search engine",
"Payments" (via Stripe), "Email delivery" and "File hosting" — no component named specifically
"API", so the check covers `["*"]` (the whole page) rather than one component.

Like `apps/gorgias`'s Statuspage instance, Booqable's puts every update for one incident inside a
**single** `<entry>`'s content, newest update first, rather than one entry per update — the check's
`RESOLVED` regex is matched against the whole concatenated text for exactly that reason.

### Is this credential's company reachable?

**`company-domain`** (`kind: "dependency"`, `scope: "connection"`, `credential: "context"`) —
verified live 2026-09-06. Booqable serves **every** `*.booqable.com` subdomain from one shared
Heroku app (`via: heroku-router` on every response, real or fabricated slug alike), so a bad company
slug can't be told apart at the DNS/TLS level the way a per-tenant CNAME could — the distinction only
exists in the JSON error body:

- An unauthenticated `GET /companies/current` against a **real** company (`irent.booqable.com`, from
  a documented example) answers `401 {"errors":[{"code":"unauthorized","title":"Access
  denied","detail":"You need to be logged in."}]}`.
- The exact same request against a **fabricated** slug, and against the docs' own placeholder host
  (`example.booqable.com` — not a real company), both answer `404
  {"errors":[{"code":"resources_not_found","title":"Resource(s) not found"}]}`.

So this check treats an unsigned **401 as a pass** (the company exists and is serving — whether the
credential itself is any good is the derived `auth:*` check's job) and a **404 as down**.

### Do we have quota left?

**`quota`** (`kind: "quota"`, `severity: "informational"`) — Booqable does **not** expose quota via
response headers the way Gorgias/Shopify do (verified 2026-09-06: no `X-RateLimit-*`/`Retry-After`
header appears anywhere in the docs or in a live probe's response headers). Instead,
`GET /companies/current?extra_fields[companies]=subscription&fields[companies]=subscription` —
documented under "Fetch subscription details" — returns the numbers directly in the body:
`subscription.restrictions.api_monthly_calls` (the ceiling) and `subscription.api_usage_count`
(calls used this period), confirmed against the docs' own worked example
(`"api_monthly_calls":1000000, ... "api_usage_count":0`). The same `restrictions` hash also carries
`rate_limit_max`/`rate_limit_period` (e.g. 250 calls per 60 seconds) — a separate, shorter-window
throttle this check cannot report headroom for, since no "used in this window" counter is exposed
anywhere; it is surfaced only in the check's message, not as a second `quota[]` entry.

## Actions

| Key | Type | Description |
|---|---|---|
| `customer-list` | read | List customers |
| `customer-search` | search | Advanced search across customers |
| `customer-get` | read | Fetch a customer |
| `customer-create` | perform | Create a customer |
| `customer-update` | perform | Update a customer |
| `customer-archive` | perform | Archive a customer (soft — `DELETE` returns 200) |
| `product-group-list` | read | List product groups |
| `product-group-get` | read | Fetch a product group |
| `product-group-create` | perform | Create a product group |
| `product-group-update` | perform | Update a product group |
| `product-list` | read | List product variants |
| `product-search` | search | Advanced search across product variants |
| `product-get` | read | Fetch a product variant |
| `product-create` | perform | Create a product variant under a group |
| `product-update` | perform | Update a product variant |
| `product-archive` | perform | Archive a product variant (soft — `DELETE` returns 200) |
| `order-list` | read | List orders |
| `order-search` | search | Advanced search across orders |
| `order-get` | read | Fetch an order |
| `order-create` | perform | Create an empty order for a date range |
| `order-update` | perform | Update order fields (customer, dates, deposit, …) |
| `order-status-transition` | perform | Move an order between statuses |
| `stock-item-list` | read | List stock items |
| `stock-item-get` | read | Fetch a stock item |
| `planning-list` | read | List plannings (item reservations) |
| `planning-get` | read | Fetch a planning |

### Deliberately left out

- **Request signing** (JWT-based) auth — see "Auth scheme" above.
- Order line items, payments, coupons, documents, signatures, webhooks, and everything under
  Delivery/Fulfillment beyond the status transition itself — Booqable's full v4 surface is very
  large (60+ resources); this app scopes to the rental core (customers, the product catalog, orders
  and their lifecycle, stock, plannings) rather than guessing at the rest.
- Planning create/update — the docs give plannings no standalone write endpoint; creating one is
  normally a side effect of booking an order via sideposting on a line/order write.
- Inline address/property creation on orders and customers (`properties_attributes`,
  `delivery_address_property_id`) — both reference or create account-specific Properties, a shape
  this app cannot express safely as a fixed Param.
