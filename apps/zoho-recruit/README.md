# Zoho Recruit

Create, read, update, search and change the pipeline status of Candidates, Job Openings and Clients
in Zoho Recruit — an applicant tracking system — plus attach Notes to any record.

Scoped to **Zoho Recruit specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks` and
`zohodesk`, separate products with separate API surfaces — do not confuse the four, and do not modify
`apps/zoho/`, `apps/zohobooks/` or `apps/zohodesk/` from here.

- **Categories** — hr
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 22
- **Egress allowlist** — `recruit.zoho.com`, `recruit.zoho.eu`, `recruit.zoho.in`,
  `recruit.zoho.com.au`, `recruit.zoho.jp`, `recruit.zoho.com.cn`, `recruit.zoho.sa`,
  `recruit.zohocloud.ca`, `recruit.zoho.sg`, `recruit.zoho.ae`
- **Website** — https://www.zoho.com/recruit/
- **API docs** — https://www.zoho.com/recruit/developer-guide/apiv2/

## Actions

| Resource     | Actions                                              |
| ------------ | ----------------------------------------------------- |
| Candidate    | list, get, create, update, delete, change status      |
| Job Opening  | list, get, create, update, delete, change status      |
| Client       | list, get, create, update, delete                     |
| Note         | list, create, update, delete                          |
| Any module   | search (generic — `search-records`)                   |

`search-records` reaches any module by API name — Candidates, Job Openings, Clients, Interviews,
Contacts, or a custom one — through Zoho's uniform `GET /{module}/search`, rather than one
`*-search` action per resource.

Deliberately absent: Bulk Read/Write (a separate asynchronous job-based surface with its own
create-job/poll/download lifecycle), file/attachment upload (multipart), and blueprint/approval-process
actions — none of those are core CRUD-and-status workflow automation. `lib/recruit.ts`'s generic
`recruitList`/`recruitGet`/`recruitCreate`/`recruitUpdate`/`recruitDelete`/`recruitSearch`/
`recruitChangeStatus` helpers cover most additional Recruit modules (Interviews, Contacts, Tasks,
Events, Vendors, Departments, ...) with a thin new action file, the same way the 22 here were built.

`candidate-create`/`candidate-update`, `job-opening-create`/`job-opening-update` and
`client-create`/`client-update` all take a generic `fields` JSON object rather than a fixed param per
field — Zoho Recruit's create/update bodies run to dozens of optional fields (subforms for education
and experience, custom fields, ...) that would bloat every form for the common case. Each action's
description states the one or two fields Zoho actually requires.

## `fields` is optional on Get Records — unlike identically-shaped Zoho CRM

Zoho CRM's `/crm/v6/{module}` (see this pack's `zoho` app) 400s without an explicit `fields` query
param — there is no "everything" default. Zoho Recruit's own parameter table for the identically
named and shaped `/recruit/v2/{module}` documents `fields` as `(optional)`. Every list/get/search
action here leaves it unset by default rather than shipping a forced field list to work around a
requirement that does not exist for this product — confirmed directly from the vendor's own
parameter table (`get-records.html`), not inferred from the sibling `zoho` app's behavior.

## Regional data centres (all ten) — and where the vendor's own docs get it wrong

Zoho hosts every Recruit account in one of **ten** regional data centres. This app routes each region
through its own dedicated connection (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`,
`oauth2-cn`, `oauth2-sa`, `oauth2-ca`, `oauth2-sg`, `oauth2-ae`) rather than one that could silently
send a EU account's requests through the US region instead — the same shape this pack's `zohobooks`
and `zohodesk` apps use, for the same reason: the OAuth authorization/token host is baked into the
flow itself, so a single method with a "data centre" field cannot express it.

**Two things Zoho's own "Multi DC" doc page gets wrong, found only by probing live:**

1. **The wrong API host convention for every non-US region.** The page
   (`.../developer-guide/apiv2/multi-dc.html`) tells readers to address, e.g., the EU region at
   `https://www.zohoapis.eu/recruit/v2/Candidates`. Live, on 2026-09-05, every
   `www.zohoapis.<tld>/recruit/v2/...` path answers a generic `404 API endpoint not found` — a
   gateway response, not Recruit's own structured error shape. The real host is
   `recruit.zoho.<tld>` **directly**, the same shape this pack's `zohodesk` app documents for
   `desk.zoho.<tld>` and `zohomail` for `mail.zoho.<tld>`. `zoho` (CRM) and `zohobooks` genuinely do
   sit behind the shared `www.zohoapis.<tld>` gateway — that convention just does not carry over to
   Recruit, and the vendor's own doc page for Recruit says it does.
2. **Only six of the ten live data centres are listed.** The same page names US, AU, EU, IN, CN and
   JP. Live probing found four more that were never mentioned there: Saudi Arabia, Canada, Singapore
   and the United Arab Emirates — the same set of ten this pack's `zohodesk` app documents for Zoho
   Desk. Each of the four missing ones was confirmed the same way as the six documented ones: an
   unauthenticated `GET /recruit/v2/Candidates` against `recruit.zoho.sa` / `recruit.zohocloud.ca` /
   `recruit.zoho.sg` / `recruit.zoho.ae` answers the documented
   `401 {"code":"AUTHENTICATION_FAILURE",...}` shape, and the matching `accounts.zoho.<tld>` (or
   `accounts.zohocloud.ca`) answers `302` for a syntactically valid authorize request. A few
   plausible-but-wrong guesses (`recruit.zoho.ca`, `recruit.zoho.com.sg`, `accounts.zoho.com.sg`)
   were also probed and failed DNS resolution outright, ruling out a false positive from some
   wildcard catch-all before trusting the ten that did resolve.

**Canada is again the one region where the accounts host does not follow the API host's naming
pattern** — exactly as `zohobooks`, `zohodesk` and `zohomail` already document for their own Canadian
entries. `recruit.zohocloud.ca` is the real API host; `recruit.zoho.ca` does not resolve at all. The
matching OAuth host is `accounts.zohocloud.ca`; `accounts.zoho.ca` fails to connect. Assuming the
pattern the other nine regions follow breaks this one silently, in a way that looks like a typo
rather than a design fact.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the authenticated user's own id/name when reachable —
`lib/client.ts#apiHostFromConnection` reads it back on every action.

## Search lives under its own OAuth scope

Every action in this app except search needs only `ZohoRecruit.modules.ALL` — the "modules" scope
family covers create/read/update/delete across Candidates, Job Openings, Clients and Notes in one
grant. `search-records` and Zoho's own per-module search-by-criteria endpoint are documented under a
**separate** scope, `ZohoRecruit.search.READ` (`search-records.html`'s "Scope" section). A client
scoped only to `modules.ALL` will 401 on every search call — `auth/oauth2.ts` requests both scopes
(plus `ZohoRecruit.users.READ`, needed only by this app's own `test`/`afterConnect` probe) by default.

## Change Status nests its response one level deeper than every other write endpoint

Insert, update, delete and every Note write answer `{"data": [{"code","status",...}]}` — one entry
per record submitted, batch-style, even for the single record this app always sends. **Change
Status answers `{"data": [[{"code","status",...}]]}`** — an outer array (one entry per status
request submitted, always one here) wrapping an **inner** array, one entry per record id changed.
`lib/client.ts#unwrapStatusResult` flattens that; reusing the flat `unwrapRecordResult` on a
Change Status response would silently treat the whole inner array as a single malformed result.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho`,
`zohobooks` and `zohodesk` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Recruit"` — confirmed live 2026-09-05
(`"Zoho Recruit - Operational"`, distinct from the generic Zoho umbrella entries on the same page).

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
GET /recruit/v2/users?type=CurrentUser
```

The cheapest authenticated call this app knows: it needs only `ZohoRecruit.users.READ` and returns
just the caller's own profile — no organization- or record-level data. Classified by the vendor's own
`code`, not by HTTP status alone — confirmed live against `recruit.zoho.com`:

| Request                                    | HTTP | `code`                 | Meaning                              |
| ------------------------------------------- | ---- | ----------------------- | ------------------------------------- |
| No `Authorization` header at all            | 401  | `AUTHENTICATION_FAILURE`| No usable token reached the request   |
| `Authorization: Zoho-oauthtoken garbage`    | 401  | `INVALID_TOKEN`         | The token is syntactically present but dead |

Two different problems with two different fixes — collapsing them into one bare 401 would misreport
one as the other. A third documented code, `OAUTH_SCOPE_MISMATCH`, fires when a live token lacks a
scope an endpoint needs.

### Do we have quota left?

**Declared unavailable.** Zoho Recruit documents a real 24-hour rolling API-credit system (a "Get
Records" call costs 3 credits, most others cost 1; edition-based daily allowances from 5,000 to
1,000,000 credits) plus separate concurrency/sub-concurrency limits — but none of that is exposed as
a *response header* the way Zoho CRM's `X-API-CREDITS-REMAINING` is. A live unauthenticated
`GET /recruit/v2/Candidates` (and the same call with a fake token) against `recruit.zoho.com` carries
no `X-RateLimit-*` or similarly named header at all — checked 2026-09-05. `health/quota.ts` states
this as a positive absence with `severity: "informational"` (required — an `unavailable` check always
reports `unknown`, which outranks `ok`, so any other severity would pin the App's verdict at
`unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (10)  |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Notes module is admin-only for reads

Zoho's own doc for `GET /Notes` states: "Only admin users can fetch the records from the Notes
module. The system throws an error when non-admin users try to fetch the records from the Notes
module." A non-admin connection can still `note-create`/`note-update`/`note-delete`; only
`note-list` is affected. This app does not attempt to work around that restriction — it is stated
here so a `note-list` failure on a non-admin connection is not mistaken for a bug.

## Icon

`assets/icon.svg` is byte-identical to `apps/zoho/assets/icon.svg` — same vendor, same mark, not
re-sourced. See that app's README for the artwork's own provenance (Zoho's product-logo SVG, verbatim
inside the pack's normalized canvas).

## Findings worth a day saved

1. **Zoho's own "Multi DC" page for Recruit is wrong about the API host, and incomplete about the
   region count.** It tells readers to use `www.zohoapis.<tld>` for non-US regions (a generic 404,
   live) instead of the real `recruit.zoho.<tld>`, and lists 6 data centres instead of the 10 that
   actually resolve. See "Regional data centres" above — this is the kind of error that looks like
   your own integration is broken when it is the vendor's doc that's stale.
2. **Search needs a scope none of the other actions do.** `ZohoRecruit.search.READ` is separate from
   `ZohoRecruit.modules.ALL`; a client scoped from the resource names alone will 401 on every search
   call. See "Search lives under its own OAuth scope" above.
3. **Change Status nests its response one level deeper than every other write endpoint.** Reusing the
   flat per-record unwrap on it silently mishandles the result. See "Change Status nests..." above.

---

Researched and endpoint-verified 2026-09-05 against
`https://www.zoho.com/recruit/developer-guide/apiv2/` (modules-api, get-records, insert-records,
update-records, delete-records, search-records, change-status, get/create/update/delete-notes,
get-attachments, get-users, oauth-overview, multi-dc, limits), plus live probes against all ten
`recruit.zoho.<tld>` API hosts, their accounts hosts, and `us.zohostatus.com`. Status surfaces move;
re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
