# Zoho Inventory

Track stock, catalog items, contacts, warehouses and sales orders in Zoho Inventory — inventory
management for small and growing businesses.

Scoped to **Zoho Inventory specifically**. This pack already ships `zohobooks` (Zoho Books),
`zoho-invoice` (Zoho Invoice) and `zoho` (Zoho CRM) — separate products with separate API roots,
even though they share Zoho's OAuth mechanics, response envelope and error codes. Do not confuse
them, and do not modify those apps from here.

- **Categories** — finance, commerce
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 17
- **Egress allowlist** — `www.zohoapis.com`, `www.zohoapis.eu`, `www.zohoapis.in`,
  `www.zohoapis.com.au`, `www.zohoapis.jp`, `www.zohoapis.ca`, `www.zohoapis.com.cn`,
  `www.zohoapis.sa`, `us.zohostatus.com`
- **Website** — https://www.zoho.com/inventory/
- **API docs** — https://www.zoho.com/inventory/api/v1/introduction/

## Actions

| Resource     | Actions                                        |
| ------------ | ---------------------------------------------- |
| Organization | list                                          |
| Contact      | list, get, create, update, delete              |
| Item         | list, get, create, update, delete              |
| Location     | list                                          |
| Sales order  | list, get, create, update, delete              |

Every one of the five groups in the build priority order is implemented — nothing was deferred.

Deliberately absent: purchases, bills, purchase orders, transfer orders, assemblies, shipments,
packages, inventory adjustments, price lists and every jurisdiction-specific tax feature (GST,
CFDI, e-way bills, ...) — none of those are core CRUD workflow automation, and several are
jurisdiction-specific in ways this app does not attempt to model generically. Sales-order status
transitions (`POST /salesorders/{id}/status/...`) are real Inventory endpoints and equally left out.
If a workflow needs one of them, `lib/inventory.ts`'s generic
`inventoryList`/`inventoryGet`/`inventoryCreate`/`inventoryUpdate`/`inventoryDelete` helpers cover
most additional Inventory endpoints with a thin new action file, the same way the 17 here were
built.

List actions take **only** the organization and pagination (`page`, `per_page`) — Inventory's
documented list filters (`contact_type`, `search_text`, `filter_by`, `sort_column`, ...) are
deliberately not modelled, matching `zohobooks`' scope.

`contact-create`/`contact-update`, `item-create`/`item-update` and
`salesorder-create`/`salesorder-update` all take a generic `fields` JSON object rather than a fixed
param per field — Zoho's create/update bodies run to dozens of optional, region-specific
attributes (GST treatment, CFDI usage, reverse-charge flags, ...) that would bloat every form for
the common case. Each action's description states the fields Zoho actually requires:

| Action              | Required fields      | Documented optional fields in the description                                 |
| ------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `contact-create`    | `contact_name`       | `company_name`, `contact_type` (`customer`/`vendor`), `website`               |
| `item-create`       | `name`               | `rate`, `sku`, `item_type` (`inventory`/`sales`/`purchases`/`sales_and_purchases`), `product_type` (`goods`/`service`) |
| `salesorder-create` | `customer_id`, `line_items` | each line item: `item_id`, `quantity` (required), `rate` (optional)    |

## `organization_id` is required on (almost) every call

Zoho Inventory calls a business an "organization"; **every** documented endpoint except
`GET /organizations` itself requires `organization_id` as a **query parameter** — the vendor's own
cURL example is `POST https://www.zohoapis.com/inventory/v1/contacts?organization_id=10234695` — or
it answers an Inventory-specific `400` that reads like a broken action rather than a missing
setting. Every action here exposes an optional `organizationId` param, falling back to the id
`auth/oauth2.ts`'s `afterConnect` records on the connection (its default organization) — the common
single-organization case needs nothing typed in. Run `organization-list` to see every id available
and pass one explicitly for a non-default organization.

## Regional data centres (all eight)

Zoho hosts every organization in one of **eight** regional data centres — United States, Europe,
India, Australia, Japan, Canada, China, Saudi Arabia — each with its own API host
(`www.zohoapis.<tld>`) and (almost always) its own OAuth host (`accounts.zoho.<tld>`). An
organization only exists on one data centre, and its OAuth authorization/token endpoints are **not
interchangeable** across them — an EU-hosted organization cannot complete an authorization request
sent to `accounts.zoho.com`.

**Inventory uses the shared `www.zohoapis.<tld>` gateway host, with the product chosen by the
`/inventory/v1` path — not a dedicated product subdomain.** This pack's `zohodesk` and
`zoho-campaigns` apps each address a `*.zoho.<tld>` host per region; a host pattern learned from
those siblings does not transfer here. The API root is
`https://www.zohoapis.com/inventory/v1` (US), and there are eight of them.

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific accounts host before any in-flow field could be read), a single `oauth2` auth method with a
"data centre" selector cannot express this — RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl`
are static per method. So `auth/oauth2.ts` declares **one `AuthDefinition` per data centre** instead
(`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-ca`, `oauth2-cn`,
`oauth2-sa`) — the user picks the method matching their organization's data centre when connecting,
and `w6w.network.allow` lists every corresponding API host so any of the eight can be used.

**Canada is the one region where the accounts host does NOT follow the API host's naming pattern.**
The documented Canadian API host is `https://www.zohoapis.ca/inventory/v1` — the same
`www.zohoapis.<tld>` shape as the other seven — but there is **no** `accounts.zoho.ca`. A live probe
of `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at all (measured 2026-09-22), while
`https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the Zoho login
page), exactly like this pack's `zohobooks` and `zohomail` apps document for their own Canadian
entry. Assuming `accounts.zoho.ca` from the pattern the other seven regions follow breaks OAuth for
exactly one region in a way that looks like a typo rather than a design fact — `oauth2-ca` uses
`accounts.zohocloud.ca` deliberately.

All eight `www.zohoapis.<tld>/inventory/v1` API hosts were probed unauthenticated on 2026-09-22 and
every one answered the documented shape:

```
401 {"code":14,"message":"The request could not be authenticated as the authentication value you
     entered is invalid. Enter a valid authentication value and try again."}
```

— not a catch-all 200 or a generic 404. Every `accounts.zoho.<tld>/oauth/v2/auth` (and
`accounts.zohocloud.ca`) answered `302` for a syntactically valid authorize request.

### Connecting

Register a Zoho API console client (Server-based Applications) **for the data centre your
organization lives in**, store `client_id` / `client_secret` / `redirect_uri` on this w6w
installation via `PUT /apps/io.w6w.zoho-inventory/oauth-config/oauth2-<region>`, then connect with
the `oauth2-<region>` method matching that data centre. The authorize URL requests
`access_type=offline` and `prompt=consent` (without them Zoho issues no refresh token) and the three
scopes below.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the authenticated user's default `organizationId` /
`primaryOrganizationName` when reachable — `lib/client.ts#apiHostFromConnection` and
`#organizationIdFrom` read them back, so most actions never need an explicit `organizationId` param.

## Items and Locations live under the `settings` OAuth scope family, not their own

Contacts and Sales Orders each get a same-named scope (`ZohoInventory.contacts.*`,
`ZohoInventory.salesorders.*`) — but there is no `ZohoInventory.items.*` and no
`ZohoInventory.locations.*`. Item endpoints (`POST/PUT/GET/DELETE /items`) and
`GET /locations` are documented under `ZohoInventory.settings.*`, the same scope family that also
covers `GET /organizations` itself (documented as `ZohoInventory.settings.READ`). This is easy to
miss when scoping an OAuth client from the resource names alone — a client granted only
`contacts`/`salesorders` scopes will 401 or 403 on every Item and Location action and on the
connection's own `test` probe.

```
ZohoInventory.contacts.ALL ZohoInventory.settings.ALL ZohoInventory.salesorders.ALL
```

## The response envelope names its own resource key

A successful Inventory response is `{"code": 0, "message": "success", "<resource>": ...}` — `code`
is `0` for success and non-zero for an error, and the payload lives under a resource-specific key
(`"contacts"` for a list, `"contact"` for a get, `"items"`/`"item"`, `"locations"`,
`"salesorders"`/`"salesorder"`). This is closer to Zoho CRM's per-module shape than to Zoho Mail's
fixed `data` envelope, but the key name still varies per endpoint and between a list and a get —
`lib/client.ts#unwrapResource` and `lib/inventory.ts`'s helpers take it as a parameter rather than
assuming one name.

List responses also carry the vendor's `page_context` node, which this app surfaces as
`pageContext`. Zoho's own pagination example is
`GET /contacts?page=2&per_page=25` →
`{"code":0,"message":"success","contacts":[...],"page_context":{"page":2,"per_page":25,
"has_more_page":false}}`; **pagination defaults to 200 records per page**, which the `per_page`
param's default matches.

## Warehouses: the feature that makes this its own product

Zoho Inventory tracks stock **per location** — a multi-warehouse account reports quantities against
each of them — so "how many are there" is only half an answer without a location. `location-list`
(`GET /locations`, resource key `"locations"`) is the only Location endpoint this app exposes:
creating or deleting a warehouse is an administrative change to how the whole account's stock is
reported, not something a workflow should do implicitly. Zoho Books has no equivalent resource at
all, which is why this action does not appear in `zohobooks`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zohobooks`,
`zoho` (Zoho CRM) and `zohomail` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Inventory"` — confirmed live 2026-09-22
(`"Zoho Inventory - Operational"`, distinct from the `"Zoho Books"`, `"Zoho Invoice"` and
`"Zoho CRM"` entries on the same page, so a prefix match would report the wrong product's outage).

| StatusIQ status      | Mapped state |
| -------------------- | ------------ |
| Operational          | ok           |
| Under Maintenance    | degraded     |
| Degraded Performance | degraded     |
| Partial Outage       | degraded     |
| Major Outage         | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`, `auth:oauth2-eu`,
etc.

```
GET /organizations
```

The cheapest authenticated call this app knows: it needs only `ZohoInventory.settings.READ` and
(unlike every other endpoint) no `organization_id` at all, since it is how one is discovered. It
also returns nothing secret, and the probe never echoes the credential into its result. Classified
by the vendor's own `code`, not by HTTP status alone — confirmed live against `www.zohoapis.com`:

| Request                                 | HTTP | `code` | Meaning                                     |
| --------------------------------------- | ---- | ------ | ------------------------------------------- |
| No `Authorization` header at all        | 401  | 14     | No usable token reached the request         |
| `Authorization: Zoho-oauthtoken garbage` | 401  | 57     | The token is syntactically present but dead |

Two different problems with two different fixes — collapsing them into one bare 401 would misreport
one as the other.

### Do we have quota left?

**Declared unavailable.** Zoho documents request limits and the error bodies returned once they are
hit, but none of that is exposed as a *response header* the way Zoho CRM's
`X-API-CREDITS-REMAINING` is. A live unauthenticated `GET /organizations` (and the same call with a
dead token) carries no `X-RateLimit-*` or similarly named header at all — checked 2026-09-22.
`health/quota.ts` states this as a positive absence with `severity: "informational"` (required — an
`unavailable` check always reports `unknown`, which outranks `ok`, so any other severity would pin
the App's verdict at `unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                     | Kind       | Scope      | Credential | Severity       | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | ------------------------------------------------------------ |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                   |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                 |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8) |

The host `us.zohostatus.com` (for `service`) is listed in `w6w.network.allow` because the feed
check reads it, and the check declares `credential: "none"` — an unsigned status host never pairs
with a credential, so no token can reach it.

## Findings worth a day saved

1. **The API root is the shared `www.zohoapis.<tld>` gateway with a `/inventory/v1` path — not a
   product host.** `zohodesk` and `zoho-campaigns` each get their own `*.zoho.<tld>` per region, so a
   host pattern learned from those siblings sends you looking for an `inventory.zoho.tld` that does
   not exist. Eight data centres, eight plain gateway hosts, product selected by path.
2. **`organization_id` is required almost everywhere, as a QUERY parameter, and getting it wrong
   doesn't 401.** It is on essentially every endpoint except the discovery call itself; a
   missing/wrong one answers a `400` that reads like a bug in the integration rather than a
   configuration gap. Passing it in a POST body instead of the query string silently does nothing.
3. **Items and Locations are scoped under `ZohoInventory.settings.*`, not their own scopes.** A
   client scoped from the resource names alone will silently lack access to half the catalog
   surface — and to the connection's own `test` probe.
4. **Canada's OAuth host breaks the pattern the other seven regions follow.** `www.zohoapis.ca` is
   the documented API host, but there is no `accounts.zoho.ca` — the real accounts host is
   `accounts.zohocloud.ca`, confirmed by a live connection failure on the naive guess.
5. **Stock is tracked per warehouse.** `GET /locations` is what turns a quantity into an answer;
   accounting-only siblings have no such resource.

---

Researched and endpoint-verified 2026-09-22 against `https://www.zoho.com/inventory/api/v1/`
(introduction, oauth, pagination, errors, organizations, contacts, items, locations, salesorders),
plus live probes against all eight `www.zohoapis.<tld>` API hosts, their accounts hosts, and
`us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a
probe starts failing for everyone at once.
