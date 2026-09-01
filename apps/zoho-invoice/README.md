# Zoho Invoice

Create, send and manage contacts, items, invoices and estimates in Zoho Invoice — invoicing
software.

Scoped to **Zoho Invoice specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
(Zoho Books) and `zohomail` (Zoho Mail), separate products with separate API surfaces — do not
confuse them, and do not modify `apps/zoho/`, `apps/zohobooks/` or `apps/zohomail/` from here.

- **Categories** — finance
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 22
- **Egress allowlist** — `www.zohoapis.com`, `www.zohoapis.eu`, `www.zohoapis.in`,
  `www.zohoapis.com.au`, `www.zohoapis.jp`, `www.zohoapis.ca`, `www.zohoapis.com.cn`,
  `www.zohoapis.sa`
- **Website** — https://www.zoho.com/invoice/
- **API docs** — https://www.zoho.com/invoice/api/v3/introduction/

## Actions

| Resource     | Actions                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| Organization | list                                                                    |
| Contact      | list, get, create, update, delete                                       |
| Item         | list, get, create, update, delete                                       |
| Invoice      | list, get, create, update, delete, mark as sent, void, email            |
| Estimate     | list, get, create                                                       |

Deliberately absent: recurring invoices, retainer invoices, credit notes, customer payments,
expenses/recurring expenses, projects/time entries, users, taxes, currencies, bulk/mass-export APIs,
PDF/CSV response formats, and every portal/e-invoicing/CFDI/GST regional feature — none of those are
core CRUD workflow automation, and several are jurisdiction-specific in ways this app does not
attempt to model generically. If a workflow needs one of them, `lib/invoice.ts`'s generic
`invoiceList`/`invoiceGet`/`invoiceCreate`/`invoiceUpdate`/`invoiceDelete`/`invoiceStatusAction`
helpers cover most additional Zoho Invoice endpoints with a thin new action file, the same way the 22
here were built.

`contact-create`/`contact-update`, `item-create`/`item-update`, `invoice-create`/`invoice-update` and
`estimate-create` all take a generic `fields` JSON object rather than a fixed param per field — Zoho
Invoice's create/update bodies run to dozens of optional, jurisdiction-specific fields (GST treatment,
place of supply, reverse-charge flags, ...) that would bloat every form for the common case. Each
action's description states the one or two fields Zoho actually requires.

## The organization id travels as a HEADER, not a query parameter

Like Zoho Books, Zoho Invoice calls a business an "organization"; **every** documented endpoint
except `GET /organizations` itself requires the organization id, or it answers an Invoice-specific
`400` that reads like a broken action rather than a missing setting. **Unlike Zoho Books**, Zoho
Invoice's own generated per-endpoint request examples — checked across the contacts, items, invoices
and estimates pages, 644 occurrences of the header name across those four pages alone — consistently
send it as the header `X-com-zoho-invoice-organizationid`, never as an `organization_id` query
parameter. The introduction page's own prose agrees ("The Organization ID and the Access token has to
be sent as Header in the API") even though two of its generic illustrative snippets (on the shared
`errors` and `pagination` pages, reused boilerplate across several Zoho API docs) show the older
`?organization_id=` query-param form instead. `lib/client.ts`'s `ZohoInvoiceClient` stamps the header;
every action here exposes an optional `organizationId` param, falling back to the id
`auth/oauth2.ts`'s `afterConnect` records on the connection (its default organization) — the common
single-organization case needs nothing typed in. Run `organization-list` to see every id available
and pass one explicitly for a non-default organization.

## Regional data centres (all eight)

Zoho hosts every organization in one of **eight** regional data centres — United States, Europe,
India, Australia, Japan, Canada, China, Saudi Arabia — each with its own API host
(`www.zohoapis.<tld>`) and (almost always) its own OAuth host (`accounts.zoho.<tld>`). An
organization only exists on one data centre, and its OAuth authorization/token endpoints are **not
interchangeable** across them — a EU-hosted organization cannot complete an authorization request sent
to `accounts.zoho.com`.

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific accounts host before any in-flow field could be read), a single `oauth2` auth method with a
"data centre" selector cannot express this — RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl`
are static per method. So `auth/oauth2.ts` declares **one `AuthDefinition` per data centre** instead
(`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-ca`, `oauth2-cn`,
`oauth2-sa`) — the user picks the method matching their organization's data centre when connecting,
and `w6w.network.allow` lists every corresponding API host so any of the eight can be used.

**Canada is the one region where the accounts host does NOT follow the API host's naming pattern.**
Zoho Invoice's own domain table gives the Canadian API base as `https://www.zohoapis.ca/invoice/` —
the same `www.zohoapis.<tld>` shape as the other seven — but there is **no** `accounts.zoho.ca`. A
live probe of `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at all (measured 2026-09-01),
while `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the Zoho login
page), exactly like this pack's `zohobooks` app documents for its own Canadian entry. Assuming
`accounts.zoho.ca` from the pattern the other seven regions follow breaks OAuth for exactly one
region in a way that looks like a typo rather than a design fact — `oauth2-ca` uses
`accounts.zohocloud.ca` deliberately.

The OAuth page's own domain table only lists six of the eight regions (US, EU, IN, AU, JP, CA) —
China and Saudi Arabia are absent from the table, the same gap Zoho Books' equivalent table has. Their
accounts hosts (`accounts.zoho.com.cn`, `accounts.zoho.sa`) follow the pattern the other five
non-Canada regions use and were confirmed live 2026-09-01: both answer `302` for a syntactically
valid authorize request, exactly like the documented six.

All eight `www.zohoapis.<tld>/invoice/v3/organizations` endpoints were probed unauthenticated on
2026-09-01 and every one answered the documented shape:

```
401 {"code":14,"message":"The request could not be authenticated as the authentication value you
     entered is invalid. Enter a valid authentication value and try again."}
```

— not a catch-all 200 or a generic 404. Every `accounts.zoho.<tld>/oauth/v2/auth` (and
`accounts.zohocloud.ca`) answered `302` for a syntactically valid authorize request.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the authenticated user's default `organizationId` /
`primaryOrganizationName` when reachable — `lib/client.ts#apiHostFromConnection` and
`#organizationIdFrom` read them back, so most actions never need an explicit `organizationId` param.

## Items live under the `settings` OAuth scope family, not their own

Contacts, Invoices and Estimates each get a same-named scope (`ZohoInvoice.contacts.*`,
`ZohoInvoice.invoices.*`, `ZohoInvoice.estimates.*`) — but Item CRUD endpoints (create/list/update/
retrieve/delete/mark-active/mark-inactive) are documented under `ZohoInvoice.settings.*`, the same
scope family that also covers `GET /organizations` itself. A separate `ZohoInvoice.items.READ` scope
does exist, but it only guards the "Bulk fetch item details" endpoint, which this app does not call —
easy to miss when scoping an OAuth client from the resource names alone, since a client granted only
`contacts`/`invoices`/`estimates` scopes will 401 or 403 on every Item action and on the connection's
own `test` probe.

## List Estimates has no `customer_id`/`status` filter

Unlike List Invoices (which documents both `customer_id` and `status`) and unlike Zoho Books' own
equivalent endpoint, Zoho Invoice's List Estimates documents exactly three query parameters:
`zcrm_potential_id`, `page`, `per_page` — verified 2026-09-01 against
`https://www.zoho.com/invoice/api/v3/estimates/`'s own "List estimates" section. `estimate-list`
deliberately does not invent a customer/status filter that the vendor does not support.

## List Contacts filters by status, not customer/vendor type

The documented query parameters are `filter_by` (`Status.All` / `Status.Active` / `Status.Inactive` /
`Status.Duplicate` / `Status.Crm`) and `search_text` — there is no `contact_type` query filter, unlike
what a reader familiar with Zoho Books might expect. `contact-list` filters by `filter_by` instead.

## The response envelope names its own resource key

A successful Invoice response is `{"code": 0, "message": "success", "<resource>": ...}` — `code` is
`0` for success and non-zero for an error, and the payload lives under a resource-specific key
(`"contacts"` for a list, `"contact"` for a get, `"invoices"`/`"invoice"`, `"items"`/`"item"`,
`"estimates"`/`"estimate"`). The key name varies per endpoint — `lib/client.ts#unwrapResource` and
`lib/invoice.ts`'s helpers take it as a parameter rather than assuming one name.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho CRM),
`zohobooks` and `zohomail` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Invoice"` — confirmed live 2026-09-01 (`"Zoho Invoice -
Operational"`, distinct from the generic Zoho umbrella entries and from the "Zoho Books" entry also on
the same page).

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`, `auth:oauth2-eu`,
etc.

```
GET /organizations
```

The cheapest authenticated call this app knows: it needs only `ZohoInvoice.settings.READ` and (unlike
every other endpoint) no organization id at all, since it is how one is discovered. It also returns
nothing secret. Classified by the vendor's own `code`, not by HTTP status alone — confirmed live
against `www.zohoapis.com`:

| Request                                    | HTTP | `code` | Meaning                                     |
| ------------------------------------------- | ---- | ------ | -------------------------------------------- |
| No `Authorization` header at all            | 401  | 14     | No usable token reached the request          |
| `Authorization: Zoho-oauthtoken garbage`    | 401  | 57     | The token is syntactically present but dead  |

Two different problems with two different fixes — collapsing them into one bare 401 would misreport
one as the other.

### Do we have quota left?

**Declared unavailable.** Zoho Invoice documents real per-minute (100/organization), per-day
(1,000 upward, plan-dependent) and concurrent-call limits, and the exact `{"code","message"}` bodies
returned once exceeded — but none of that is exposed as a *response header*. A live unauthenticated
`GET /organizations` (and the same call with a bad token) carries no `X-RateLimit-*` or similarly
named header at all — checked 2026-09-01. `health/quota.ts` states this as a positive absence with
`severity: "informational"` (required — an `unavailable` check always reports `unknown`, which
outranks `ok`, so any other severity would pin the App's verdict at `unknown` forever) rather than
leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8)   |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Icon

`assets/icon.png` was extracted from Zoho Invoice's own favicon
(`https://www.zoho.com/invoice/favicon.ico`, verified 200 OK, `image/x-icon`, 15,086 bytes,
2026-09-01) — a multi-frame ICO with 48×48/32×32/16×16 32bpp BGRA frames, none PNG-compressed. No
`PIL`/`icotool`/ImageMagick was available on the build host, so the 48×48 `BITMAPINFOHEADER` frame was
parsed by hand (bottom-up rows, BGRA → RGBA) and re-encoded as a standalone PNG, the same trick this
pack's `ringcentral`/`callrail`/`thrivecart` apps document for themselves.

## Findings worth a day saved

1. **The organization id travels as a HEADER, not a query parameter — the opposite of Zoho Books.**
   Every one of Zoho Invoice's own generated request examples sends
   `X-com-zoho-invoice-organizationid`; Zoho Books documents `organization_id` as a query parameter
   instead. Getting this wrong on Invoice doesn't 401 either — it's a `400` that reads like a broken
   action. See "The organization id travels as a HEADER..." above.
2. **Canada's OAuth host breaks the pattern the other seven regions follow**, exactly as Zoho Books
   documents for itself. `www.zohoapis.ca` is the documented API host, but there is no
   `accounts.zoho.ca` — the real accounts host is `accounts.zohocloud.ca`, confirmed by a live
   connection failure on the naive guess. See "Regional data centres" above.
3. **Items are scoped under `ZohoInvoice.settings.*`, not a dedicated `items` scope** — for their CRUD
   endpoints. A genuine `ZohoInvoice.items.READ` scope exists, but only for "Bulk fetch item details",
   which this app doesn't call. A client scoped from the resource names alone will silently lack
   access to the entire Item action surface. See "Items live under..." above.
4. **List Estimates and List Contacts filter differently from List Invoices.** Estimates has no
   customer/status filter at all (just `zcrm_potential_id`); Contacts filters by a `Status.*` string,
   not a `contact_type` of customer/vendor. Both are easy to over-generalize from Zoho Books' shape.
   See the two sections above.

---

Researched and endpoint-verified 2026-09-01 against `https://www.zoho.com/invoice/api/v3/introduction/`
and the per-resource pages it links to (organizations, contacts, items, invoices, estimates, oauth,
response, errors, pagination), plus live probes against all eight `www.zohoapis.<tld>` API hosts,
their accounts hosts, and `us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts`
conventions in mind if a probe starts failing for everyone at once.
