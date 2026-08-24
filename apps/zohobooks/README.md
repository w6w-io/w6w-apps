# Zoho Books

Create, send and manage contacts, items, invoices and estimates in Zoho Books — accounting and
invoicing software.

Scoped to **Zoho Books specifically**. This pack already ships `zoho` (Zoho CRM) and `zohomail`
(Zoho Mail), separate products with separate API surfaces — do not confuse the three, and do not
modify `apps/zoho/` or `apps/zohomail/` from here.

- **Categories** — finance
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 22
- **Egress allowlist** — `www.zohoapis.com`, `www.zohoapis.eu`, `www.zohoapis.in`,
  `www.zohoapis.com.au`, `www.zohoapis.jp`, `www.zohoapis.ca`, `www.zohoapis.com.cn`,
  `www.zohoapis.sa`
- **Website** — https://www.zoho.com/books/
- **API docs** — https://www.zoho.com/books/api/v3/introduction/

## Actions

| Resource     | Actions                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| Organization | list                                                                    |
| Contact      | list, get, create, update, delete                                       |
| Item         | list, get, create, update, delete                                       |
| Invoice      | list, get, create, update, delete, mark as sent, void, email            |
| Estimate     | list, get, create                                                       |

Deliberately absent: bulk/mass-export APIs, PDF/CSV response formats, recurring invoices,
sales/purchase orders, bills, banking, and every portal/e-invoicing/CFDI/GST/e-way-bill regional
feature — none of those are core CRUD workflow automation, and several are jurisdiction-specific in
ways this app does not attempt to model generically. If a workflow needs one of them, `lib/books.ts`'s
generic `booksList`/`booksGet`/`booksCreate`/`booksUpdate`/`booksDelete`/`booksStatusAction` helpers
cover most additional Books endpoints with a thin new action file, the same way the 22 here were
built.

`contact-create`/`contact-update`, `item-create`/`item-update`, `invoice-create`/`invoice-update` and
`estimate-create` all take a generic `fields` JSON object rather than a fixed param per field — Zoho
Books' create/update bodies run to dozens of optional, jurisdiction-specific fields (GST treatment,
CFDI usage, reverse-charge flags, ...) that would bloat every form for the common case. Each action's
description states the one or two fields Zoho actually requires.

## `organization_id` is required on (almost) every call

Zoho Books calls a business an "organization"; **every** documented endpoint except
`GET /organizations` itself requires `organization_id` as a query parameter, or it answers a
Books-specific `400` that reads like a broken action rather than a missing setting. Every action here
exposes an optional `organizationId` param, falling back to the id `auth/oauth2.ts`'s `afterConnect`
records on the connection (its default organization) — the common single-organization case needs
nothing typed in. Run `organization-list` to see every id available and pass one explicitly for a
non-default organization.

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
Zoho Books' own domain table gives the Canadian API base as `https://www.zohoapis.ca/books/` — the
same `www.zohoapis.<tld>` shape as the other seven — but there is **no** `accounts.zoho.ca`. A live
probe of `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at all (measured 2026-08-24), while
`https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the Zoho login page),
exactly like this pack's `zohomail` app documents for its own Canadian entry. Assuming
`accounts.zoho.ca` from the pattern the other seven regions follow breaks OAuth for exactly one
region in a way that looks like a typo rather than a design fact — `oauth2-ca` uses
`accounts.zohocloud.ca` deliberately.

All eight `www.zohoapis.<tld>/books/v3/organizations` endpoints were probed unauthenticated on
2026-08-24 and every one answered the documented shape:

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

Contacts, Invoices and Estimates each get a same-named scope (`ZohoBooks.contacts.*`,
`ZohoBooks.invoices.*`, `ZohoBooks.estimates.*`) — but there is no `ZohoBooks.items.*`. Item endpoints
(`POST/PUT/GET/DELETE /items`) are documented under `ZohoBooks.settings.*`, the same scope family that
also covers `GET /organizations` itself. This is easy to miss when scoping an OAuth client from the
resource names alone — a client granted only `contacts`/`invoices`/`estimates` scopes will 401 or 403
on every Item action and on the connection's own `test` probe.

## The response envelope names its own resource key

A successful Books response is `{"code": 0, "message": "success", "<resource>": ...}` — `code` is `0`
for success and non-zero for an error, and the payload lives under a resource-specific key
(`"contacts"` for a list, `"contact"` for a get, `"invoices"`/`"invoice"`, `"items"`/`"item"`,
`"estimates"`/`"estimate"`). This is closer to Zoho CRM's per-module shape than to Zoho Mail's fixed
`data` envelope, but the key name still varies per endpoint — `lib/client.ts#unwrapResource` and
`lib/books.ts`'s helpers take it as a parameter rather than assuming one name.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho CRM)
and `zohomail` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Books"` — confirmed live 2026-08-24 (`"Zoho Books -
Operational"`, distinct from the generic Zoho umbrella entries on the same page).

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

The cheapest authenticated call this app knows: it needs only `ZohoBooks.settings.READ` and (unlike
every other endpoint) no `organization_id` at all, since it is how one is discovered. It also returns
nothing secret. Classified by the vendor's own `code`, not by HTTP status alone — confirmed live
against `www.zohoapis.com`:

| Request                                    | HTTP | `code` | Meaning                                     |
| ------------------------------------------- | ---- | ------ | -------------------------------------------- |
| No `Authorization` header at all            | 401  | 14     | No usable token reached the request          |
| `Authorization: Zoho-oauthtoken garbage`    | 401  | 57     | The token is syntactically present but dead  |

Two different problems with two different fixes — collapsing them into one bare 401 would misreport
one as the other.

### Do we have quota left?

**Declared unavailable.** Zoho Books documents real per-minute (100/organization), per-day
(1,000–10,000, plan-dependent) and concurrent-call limits, and the exact `{"code","message"}` bodies
returned once exceeded — but none of that is exposed as a *response header* the way Zoho CRM's
`X-API-CREDITS-REMAINING` is. A live unauthenticated `GET /organizations` (and the same call with a
bad token) carries no `X-RateLimit-*` or similarly named header at all — checked 2026-08-24.
`health/quota.ts` states this as a positive absence with `severity: "informational"` (required — an
`unavailable` check always reports `unknown`, which outranks `ok`, so any other severity would pin the
App's verdict at `unknown` forever) rather than leaving a silent gap.

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

## Findings worth a day saved

1. **`organization_id` is required almost everywhere, and getting it wrong doesn't 401.** It's a
   query parameter Zoho documents on essentially every endpoint except the discovery call itself; a
   missing/wrong one answers a `400` that reads like a bug in the integration rather than a
   configuration gap. See "`organization_id` is required..." above.
2. **Canada's OAuth host breaks the pattern the other seven regions follow.** `www.zohoapis.ca` is the
   documented API host, but there is no `accounts.zoho.ca` — the real accounts host is
   `accounts.zohocloud.ca`, confirmed by a live connection failure on the naive guess. See "Regional
   data centres" above.
3. **Items are scoped under `ZohoBooks.settings.*`, not a dedicated `items` scope.** Every other
   resource in this app gets its own scope family; Items (and the organization-discovery call) do not.
   A client scoped from the resource names alone will silently lack access to half the catalog
   surface. See "Items live under..." above.

---

Researched and endpoint-verified 2026-08-24 against `https://www.zoho.com/books/api/v3/introduction/`
and the per-resource pages it links to (contacts, items, invoices, estimates, organizations, oauth,
response, errors, pagination), plus live probes against all eight `www.zohoapis.<tld>` API hosts,
their accounts hosts, and `us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts`
conventions in mind if a probe starts failing for everyone at once.
