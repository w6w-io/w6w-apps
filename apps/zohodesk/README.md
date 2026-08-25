# Zoho Desk

Create, read, update and comment on tickets, contacts and accounts in Zoho Desk — customer
support / helpdesk software.

Scoped to **Zoho Desk specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
(Zoho Books) and `zohomail` (Zoho Mail), separate products with separate API surfaces — do not
confuse the four, and do not modify `apps/zoho/`, `apps/zohobooks/` or `apps/zohomail/` from here.

- **Categories** — support
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 27
- **Egress allowlist** — `desk.zoho.com`, `desk.zoho.eu`, `desk.zoho.in`, `desk.zoho.com.au`,
  `desk.zoho.jp`, `desk.zohocloud.ca`, `desk.zoho.com.cn`, `desk.zoho.sa`, `desk.zoho.sg`,
  `desk.zoho.ae`
- **Website** — https://www.zoho.com/desk/
- **API docs** — https://desk.zoho.com/DeskAPIDocument#Introduction

## Actions

| Resource          | Actions                                                        |
| ----------------- | --------------------------------------------------------------- |
| Organization      | list                                                            |
| Ticket            | list, get, create, update, delete                               |
| Contact           | list, get, create, update, delete                                |
| Account           | list, get, create, update, delete                                |
| Agent             | list, get                                                        |
| Department        | list, get                                                        |
| Ticket Comment    | list, create                                                     |
| Ticket Thread     | list, get                                                        |
| Ticket Attachment | list, create                                                     |
| Search            | search across tickets/accounts/contacts/tasks                   |

Deliberately absent: the vast majority of Zoho Desk's surface — SLAs, business hours, custom
views, blueprints, macros, chat/telephony integration, Help Center/knowledge-base articles,
products, contracts, time entries, skill-based assignment, deduplication, domain mapping, and
every other module the docs list beyond the ten resources above. This is a huge API (the reference
document alone runs to ~10.7 MB of HTML covering hundreds of endpoints); this app covers the core
support-workflow CRUD, not the whole product. `lib/desk.ts`'s generic `deskList`/`deskGet`/
`deskCreate`/`deskUpdate`/`deskMoveToTrash` helpers cover most additional resource-shaped
endpoints with a thin new action file, the same way the 27 here were built.

`ticket-create`/`ticket-update`, `contact-create`/`contact-update` and `account-create`/
`account-update` all take a generic `fields` JSON object rather than a fixed param per field —
Zoho Desk's create/update bodies run to dozens of optional fields (custom fields, layouts,
priority, source, ...) that would bloat every form for the common case. Each action's description
states the one field Zoho actually requires.

## `orgId` is a mandatory HTTP HEADER — not a query parameter

Zoho Desk's own "Getting Started" section states plainly: "All Zoho Desk APIs require these two
mandatory fields in the header" — `Authorization` and `orgId` — and "All API endpoints except
`/organizations` mandatorily require the orgId." This is a HEADER, unlike Zoho Books'
`organization_id` (a query parameter). Sending it as a query parameter instead does not satisfy
Zoho Desk's requirement — the API answers a generic auth failure rather than a helpful "missing
orgId" message.

Every action here exposes an optional `orgId` param, falling back to the id `auth/oauth2.ts`'s
`afterConnect` records on the connection (its default organization) — the common
single-organization case needs nothing typed in. Run `organization-list` to see every id available
and pass one explicitly for a non-default organization.

**Two similarly-named organization endpoints behave oppositely on `orgId`.** `GET /organizations`
("all organizations to which the current user belongs") needs no `orgId` header at all — it is how
one is discovered, and what `organization-list` and this app's `auth/oauth2.ts` both call. `GET
/accessibleOrganizations` ("organizations which can be accessed using the current OAuth token")
sounds like the more natural discovery call but **does** require `orgId` in its own documented
curl example — useless for bootstrapping a brand-new connection that has no `orgId` yet. Reaching
for the wrong one first is an easy trap.

## Ten regional data centres — two more than `zoho`/`zohobooks` list

Zoho hosts every organization in one of **ten** regional data centres — United States, Europe,
India, Australia, Japan, Canada, China, Saudi Arabia, **Singapore**, and the **United Arab
Emirates** — verified live 2026-08-25 against the "API Endpoints by Data Center" table in Zoho
Desk's own docs. This pack's `zohobooks` app lists only eight (no Singapore/UAE), and `zoho` (Zoho
CRM) lists only the US.

**The Desk API host is `desk.zoho.<tld>` DIRECTLY — not the shared `www.zohoapis.<tld>` gateway**
every other Zoho product in this pack fronts its REST API behind (CRM, Books). Desk serves its own
API from its own product subdomain, the same shape as `zohomail`'s `mail.zoho.<tld>`. Assuming the
CRM/Books pattern points at a host that answers a generic 200/404 for Desk paths rather than the
documented `errorCode` shape — checked live 2026-08-25.

Because the OAuth authorization/token host is baked into the authorization flow itself (the
browser is redirected to a specific accounts host before any in-flow field could be read), a
single `oauth2` auth method with a "data centre" selector cannot express this — RFC `auth.md`'s
`oauth2.authorizationUrl` / `tokenUrl` are static per method. So `auth/oauth2.ts` declares **one
`AuthDefinition` per data centre** (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`,
`oauth2-jp`, `oauth2-ca`, `oauth2-cn`, `oauth2-sa`, `oauth2-sg`, `oauth2-ae`) — the user picks the
method matching their organization's data centre when connecting, and `w6w.network.allow` lists
every corresponding API host so any of the ten can be used.

**Canada is again the one region where the accounts host does NOT follow the API host's naming
pattern**, exactly as this pack's `zohobooks` and `zohomail` apps already document for their own
Canadian entries. The documented API base is `https://desk.zohocloud.ca` — but there is **no**
`accounts.zoho.ca`. A live probe of `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at
all (measured 2026-08-25), while `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a
real redirect to the Zoho login page) — `oauth2-ca` uses `accounts.zohocloud.ca` deliberately.

All ten `desk.zoho.<tld>/api/v1/organizations` endpoints were probed unauthenticated on 2026-08-25
and every one answered the documented shape:

```
401 {"errorCode":"UNAUTHORIZED","message":"You are not authenticated to perform this operation."}
```

— not a catch-all 200 or a generic 404. Every `accounts.zoho.<tld>/oauth/v2/auth` (and
`accounts.zohocloud.ca`) answered `302` for a syntactically valid authorize request.

## Several required scopes are missing from the "Scopes" reference table

Zoho Desk's `#OAuthScopes` summary table names only `Desk.tickets.*`, `Desk.contacts.*`
(READ/WRITE/UPDATE/CREATE — no DELETE), `Desk.tasks.*`, `Desk.basic.*`, `Desk.search.READ`,
`Desk.events.*` and `Desk.articles.*`. But the PER-ENDPOINT docs name `Desk.accounts.READ/CREATE/
UPDATE/DELETE`, `Desk.agents.READ`, `Desk.departments.READ`, `Desk.organization.READ` and
`Desk.contacts.DELETE` on their own "OAuth Scope" lines — none of which appear in the summary
table at all, confirmed by reading each endpoint's own scope line directly rather than trusting
the table. A client scoped from the table alone 403s on every Account/Agent/Department action and
on Contact deletion. `auth/oauth2.ts`'s scope list is the union every action in this app needs,
assembled from each endpoint's own line.

## Field names are camelCase — unlike Zoho Books' snake_case

Zoho Desk's create/update bodies use `lastName`, `departmentId`, `accountName` — camelCase,
matching Zoho CRM's convention. Zoho Books uses `contact_name`, `organization_id` — snake_case.
Muscle memory from building against one Zoho product gets this wrong in another; each
create/update action's description restates the field name shape as a reminder.

## Bulk-only delete: no single-record DELETE for Tickets, Contacts or Accounts

The only delete path for these three resources is `POST {resource}/moveToTrash`, taking a JSON
array of ids (`ticketIds`, `contactIds`, `accountIds` respectively) and answering `204 No Content`
— confirmed live for all three on 2026-08-25. There is no `DELETE /tickets/{id}`. `lib/desk.ts`'s
`deskMoveToTrash` wraps the single id each delete action here exposes into that array, so the
action still reads and behaves like a normal single-record delete.

## The response envelope is uniform — a List wraps in `data`, a Get does not

A List response is always `{"data": [...]}`. A Get response is the record itself, with **no**
wrapper at all — unlike Zoho Books, whose envelope names a resource-specific key even for a single
Get (`{"code":0,"message":"success","contact":{...}}`). Assuming a `data` key on a Get response
here would read `undefined`.

## The error shape uses a STRING `errorCode`, not Zoho Books' numeric `code`

A Zoho Desk error is `{"errorCode": "<TOKEN>", "message": "..."}` — `errorCode` is a stable string
token (`UNAUTHORIZED`, `INVALID_OAUTH`, `SCOPE_MISMATCH`, `OAUTH_ORG_MISMATCH`, `INVALID_DATA`,
`RESOURCE_SIZE_EXCEEDED`, `URL_NOT_FOUND`, ...), unlike Zoho Books' numeric `code`. Verified live
2026-08-25 against `desk.zoho.com`:

| Request                                        | HTTP | `errorCode`         | Meaning                                            |
| ----------------------------------------------- | ---- | -------------------- | --------------------------------------------------- |
| No `Authorization` header at all                | 401  | `UNAUTHORIZED`        | No usable token reached the request                 |
| `Authorization: Zoho-oauthtoken <fake>`         | 401  | `INVALID_OAUTH`       | The token is syntactically present but invalid      |
| `orgId` names an org the token isn't bound to   | —    | `OAUTH_ORG_MISMATCH`  | Documented, not independently reproduced live       |

`OAUTH_ORG_MISMATCH` ("The OAuthToken is not valid for specified organization") is documented to
fire when the `orgId` header names an organization the token was never authorized against — a
wrong-but-plausible id, not a missing one, and its message gives no hint that `orgId` specifically
is the field at fault. Worth knowing before debugging what looks like a credential problem.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho`,
`zohobooks` and `zohomail` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the
entry whose component name is exactly `"Zoho Desk"` — confirmed live 2026-08-25 (`"Zoho Desk -
Operational"`, distinct from "Zoho CRM"/"Zoho Books" and the generic Zoho umbrella entries on the
same page).

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — derived per region into
`auth:oauth2-us`, `auth:oauth2-eu`, etc.

```
GET /organizations
```

The cheapest authenticated call this app knows: it needs only `Desk.organization.READ`/
`Desk.basic.READ` and (uniquely among Desk endpoints) no `orgId` header at all, since it is how
one is discovered. It also returns nothing secret — organization metadata, not the caller's own
token. Classified by the vendor's own `errorCode`, not by HTTP status alone (see the table above).

### Do we have quota left?

**A real check, unlike `zohobooks`.** Zoho Desk publishes per-response rate-limit headers,
verified 2026-08-25 against the docs' "Ratelimit Response Headers" section:

- `X-Rate-Limit-Remaining-v3` — credits left for the portal for the current day.
- `X-Rate-Limit-Request-Weight-v3` — credits the specific call just cost (Desk's calls are
  WEIGHTED by how deep into a result set they page — a shallow list costs ~3 credits, the same
  page 10,000 records in can cost up to 50).
- `Retry-After` — appears only once the daily limit is hit.

`health/quota.ts` probes `GET /organizations` and reads `X-Rate-Limit-Remaining-v3`. There is no
fixed number to compare it against — Zoho Desk's base daily allocation varies by edition
(Free/Standard/Professional/Enterprise) and by purchased add-on credits, reaching into the
millions for a paid tier — so the check reports `down` only once the budget is fully exhausted
(`remaining <= 0`) and `degraded` under a conservative fixed floor rather than guessing a
percentage of an unknown ceiling. A live unauthenticated probe carries none of these headers at
all (checked 2026-08-25), so the header's presence can only be confirmed against a real
credential.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | connection | signed     | informational  | 300s         | `health/quota.ts` (`GET /organizations` rate-limit header)      |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (10)  |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so
a credential can never reach a status host.

## Findings worth a day saved

1. **`orgId` is a mandatory HEADER, not a query parameter — and getting the wrong "which
   organizations" call costs a bootstrapping headache.** Sending `orgId` as a query param silently
   fails; `GET /accessibleOrganizations` sounds like the discovery call but requires `orgId`
   itself, while the actually-unauthenticated-friendly discovery call is the differently-named
   `GET /organizations`. See "`orgId` is a mandatory HTTP HEADER" above.
2. **The Desk API host breaks the pattern this pack's other Zoho apps establish.**
   `www.zohoapis.<tld>` (CRM, Books) does NOT work for Desk — Desk fronts its API at
   `desk.zoho.<tld>` directly. See "Ten regional data centres" above.
3. **Half the scopes real endpoints need are missing from the official "Scopes" table.**
   `Desk.accounts.*`, `Desk.agents.READ`, `Desk.departments.READ`, `Desk.organization.READ` and
   `Desk.contacts.DELETE` are documented only on their own endpoints' scope lines, never in the
   summary table — a client scoped from the table 403s on Accounts/Agents/Departments/Contact
   deletion. See "Several required scopes are missing" above.

---

Researched and endpoint-verified 2026-08-25 against
`https://desk.zoho.com/DeskAPIDocument#Introduction` (Getting Started, HTTP Methods, OAuth/Scopes/
Data Centers, Rate limits, Organizations, Tickets, Contacts, Accounts, Agents, Departments,
Threads, Comments, Attachments, Search), plus live probes against all ten `desk.zoho.<tld>` API
hosts, their accounts hosts, and `us.zohostatus.com`. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
