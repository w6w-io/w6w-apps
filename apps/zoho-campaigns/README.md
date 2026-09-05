# Zoho Campaigns

Create and manage mailing lists, contacts, segments and email campaigns in Zoho Campaigns — email
marketing software.

Scoped to **Zoho Campaigns specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
(Zoho Books), `zohodesk` (Zoho Desk), `zohomail` (Zoho Mail) and `zoho-invoice` (Zoho Invoice),
separate products with separate API surfaces — do not confuse them, and do not modify any of those
apps from here.

- **Categories** — marketing, email
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 24
- **Egress allowlist** — `campaigns.zoho.com`, `campaigns.zoho.eu`, `campaigns.zoho.in`,
  `campaigns.zoho.com.au`, `campaigns.zoho.jp`, `campaigns.zohocloud.ca`, `campaigns.zoho.com.cn`,
  `campaigns.zoho.sa`
- **Website** — https://www.zoho.com/campaigns/
- **API docs** — https://www.zoho.com/campaigns/help/developers/

## Actions

| Resource | Actions                                                                                     |
| -------- | -------------------------------------------------------------------------------------------- |
| List     | list, create, update, delete, get total contacts, get advanced details                       |
| Contact  | add to existing list (bulk), subscribe, unsubscribe, move to do-not-mail, list, list fields, create field |
| Segment  | get details, get contacts                                                                    |
| Campaign | create, list recent, list recently sent, get details, get reports, send, schedule, clone, delete |

Deliberately absent:

- **Coupon management** (`change-coupon-status`/`view-coupon-details` in the vendor's own nav) —
  Shopify-specific and jurisdiction/platform-specific in ways this app does not attempt to model
  generically.
- **Merge tags** — the vendor's own doc page for it
  (`https://www.zoho.com/campaigns/help/developers/merge-tags.html`) is internally inconsistent: its
  parameter table lists `fieldname`/`tagtype`/`fieldtype`/`mailvalue`/`socialvalue` but its own sample
  request URL uses a different, undocumented `mergename` parameter instead, and its sample response
  carries error code `917`, which does not appear anywhere on the vendor's own error-codes page. Rather
  than guess at the real contract from a page that disagrees with itself, this app leaves merge tags
  out.
- **Topic management** — its doc page
  (`https://www.zoho.com/campaigns/help/developers/topic-management.html`) is a bare three-row table
  naming three method names (`createtopics`, `gettopics`, `getproduct`) with no parameter tables,
  sample requests or response shapes to verify anything against.

`list-create`/`contact-add-bulk`/`contact-subscribe`/`contact-unsubscribe`/`contact-do-not-mail`/
`campaign-clone` take a generic JSON object for their vendor-defined multi-field payloads
(`contactInfo`, `listDetails`, `campaignInfo`) rather than a fixed param per field, mirroring the same
choice this pack's other Zoho apps make for their own multi-field bodies — each action's description
states the field(s) the vendor actually requires.

## The API host is `campaigns.zoho.<tld>`, not the shared `www.zohoapis.<tld>` gateway

Every other Zoho app in this pack (`zoho`, `zohobooks`, `zohodesk`, `zoho-invoice`) addresses the
unified `www.zohoapis.<tld>` gateway. **Zoho Campaigns does not** — its own documentation
(`https://www.zoho.com/campaigns/help/developers/access-token.html`) gives the API root as
`https://campaigns.zoho.com/api/v1.1/`, a dedicated host that predates the unified gateway and was
never migrated onto it. Assuming the `zohoapis` pattern from the other apps in this pack would point
every single call at the wrong host.

## Every parameter travels as a QUERY STRING value, even on a documented POST

The opposite of `zoho-invoice`/`zohobooks`, which POST a JSON body. **Not one** of Zoho Campaigns' own
sample requests — across every endpoint checked (list management, contact management, campaign
management, ~25 pages total) — shows a request body, despite several endpoints' header block printing
`Content-Type: application/x-www-form-urlencoded`. Every sample is a full URL with every parameter —
including JSON-encoded values like `contactinfo`, `list_details`, `segments` and `campaigninfo` —
appended to the query string. `lib/client.ts`'s `ZohoCampaignsClient` follows the samples literally:
every parameter is a query-string value, and no request ever carries a body. Getting this backwards
(POSTing a JSON body instead) does not error cleanly — the documented parameters are simply never
read, and the call fails as though they were never passed (e.g. `903 Mandatory fields are missing`).

## A handful of endpoints embed the response format in the PATH, not just the query string

`listsubscribe`, `listunsubscribe`, `contactdonotmail` and `clonecampaign` are documented as
`/api/v1.1/[xml/json]/<endpoint>` — the format is a path segment, in addition to (redundantly with)
the `resfmt` query parameter every other endpoint uses alone. This app always requests the JSON shape,
so `lib/client.ts#campaignsPath` prefixes those four with `json/` and leaves every other endpoint's
path alone.

## A minority of endpoints name the format parameter `type`, not `resfmt`

`contact/allfields` (Get All Contact Fields) and `custom/add` (Create Custom Field) document a
`type=xml|json` parameter instead of `resfmt` — every other endpoint checked uses `resfmt`. These are
also the same two endpoints (see below) whose sample success response nests its payload one level
deeper — an inconsistency worth flagging in the same breath, since it means whatever made these two
endpoints different from the rest also affected their documented envelope shape.

## No organization/account id anywhere — unlike Zoho Books/Invoice

Zoho Campaigns has no multi-organization concept in its API: every documented endpoint acts on the one
account the access token authorizes, with no id parameter to pass or discover anywhere in the
developer guide. There is no `organization-list`-equivalent action in this app for that reason — there
is nothing to list.

## The response envelope is inconsistent, not a uniform `{code, message, <resource>}` wrapper

A success carries `{"status": "success", "code": "0" or "200", ...}` with the actual payload inlined
at the **top level** under an endpoint-specific key (`list_of_details`, `recent_campaigns`,
`no_of_contacts`, `segment_contacts`, ...) — so, unlike `zoho-invoice`/`zohobooks`, `lib/client.ts`
does not attempt a generic "unwrap" helper for the happy path; each action reads the field(s) its own
endpoint documents.

A failure is `{"status": "error", "message": "...", "Code": "...", "URI": "..."}` — confirmed live
against every regional host with no `Authorization` header and with a syntactically-plausible dead
token (both answer identically, see below). **`Code`/`URI` are capitalized on an error response but
lowercase (`code`/`uri`) on a success response** — confirmed live; `lib/client.ts#formatCampaignsError`
reads both cases defensively.

**Three endpoints — `custom/add`, `contact/allfields`, and unexpectedly `sendcampaign` — nest their
success payload one level deeper, under a `"response"` key**
(`{"response": {"code": "0", ...}}`), while every other endpoint inlines its fields at the top level.
This is not tied to the `type=json` vs `resfmt=JSON` split — `sendcampaign` uses `resfmt`, the same as
the flat majority — so it looks like an inconsistency in the vendor's own published examples rather
than a rule this app can predict from the transport. `lib/client.ts#unwrapEnvelope` reads whichever
shape shows up rather than assuming one; `campaign-schedule` calls the identical `/sendcampaign`
endpoint (with `isschedule=true`) and its own sample response is flat, so both shapes are handled.

## No way to tell "never configured" apart from "revoked/expired"

Every regional API host was probed unauthenticated on 2026-09-05 against
`/api/v1.1/getmailinglists?resfmt=JSON`: with no `Authorization` header at all, and again with a
syntactically-plausible-but-dead `Zoho-oauthtoken`, both answer the **identical**
`401 {"status":"error","Code":"1007","message":"Unauthorized request."}` (error code 1007 =
"Unauthorized key" per the vendor's own error-codes page). Unlike `zoho-invoice`, which distinguishes
"no token" (code 14) from "a dead token" (code 57), Zoho Campaigns' `auth/oauth2.ts#test` hook cannot
report which of the two happened — only that the credential did not work.

## Regional data centres (all eight) — and Canada breaks BOTH hosts, not just one

Zoho hosts every account in one of **eight** regional data centres — United States, Europe, India,
Australia, Japan, Canada, China, Saudi Arabia. Zoho Campaigns' own docs only ever show the US host
(`campaigns.zoho.com`); every other regional API host below was confirmed by direct, unauthenticated
probe on 2026-09-05, each answering the identical `401 {"Code":"1007",...}` shape above rather than a
catch-all 200 or a generic 404:

| Region        | API host                 | OAuth accounts host      |
| ------------- | ------------------------- | -------------------------- |
| United States | `campaigns.zoho.com`       | `accounts.zoho.com`         |
| Europe        | `campaigns.zoho.eu`        | `accounts.zoho.eu`          |
| India         | `campaigns.zoho.in`        | `accounts.zoho.in`          |
| Australia     | `campaigns.zoho.com.au`    | `accounts.zoho.com.au`      |
| Japan         | `campaigns.zoho.jp`        | `accounts.zoho.jp`          |
| Canada        | `campaigns.zohocloud.ca`   | `accounts.zohocloud.ca`     |
| China         | `campaigns.zoho.com.cn`    | `accounts.zoho.com.cn`      |
| Saudi Arabia  | `campaigns.zoho.sa`        | `accounts.zoho.sa`          |

**Every other Zoho app in this pack documents Canada's *accounts* host as the one pattern-breaking
exception** (`accounts.zohocloud.ca` instead of the `accounts.zoho.ca` the `accounts.zoho.<tld>`
pattern predicts), while their *API* host still follows the regular pattern — e.g. `zoho-invoice`'s
`www.zohoapis.ca` resolves fine (confirmed live 2026-09-05, `401` on an unauthenticated call). **Zoho
Campaigns is worse: `campaigns.zoho.ca` does not resolve AT ALL** —

```
$ curl https://campaigns.zoho.ca/api/v1.1/getmailinglists
curl: (6) Could not resolve host: campaigns.zoho.ca
```

— confirmed live 2026-09-05. The real Campaigns API host for Canada is **also**
`campaigns.zohocloud.ca` (confirmed live: `401 {"Code":"1007",...}`, the same documented shape every
other region answers). Assuming `campaigns.zoho.ca` from the other seven regions' pattern — or from
how every *other* Zoho product in this pack handles Canada — breaks the connection outright rather
than merely mis-routing a call to the wrong data centre.

Because the OAuth authorization/token host is baked into the auth flow itself (the browser is
redirected to a specific accounts host before any in-flow field could be read), a single `oauth2`
method with a "data centre" selector cannot express this — `auth/oauth2.ts` declares **one
`AuthDefinition` per data centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`,
`oauth2-jp`, `oauth2-ca`, `oauth2-cn`, `oauth2-sa`), the same structural choice this pack's other Zoho
apps make for the identical reason.

## Auth scopes

Zoho Campaigns' scope vocabulary is per-resource with `.READ`/`.CREATE`/`.UPDATE`/`.DELETE` suffixes
plus combined `.CREATE-UPDATE`/`.WRITE`/`.ALL` aliases — the same shape as this pack's other Zoho apps.
Unlike Books/Invoice's several resource families, Campaigns has only two: `ZohoCampaigns.contact.*`
(covers mailing lists, contacts, segments and custom fields — confirmed against the scope table on
`access-token.html` and every linked list/contact endpoint page) and `ZohoCampaigns.campaign.*`
(covers campaigns). This app requests `ZohoCampaigns.contact.ALL` and `ZohoCampaigns.campaign.ALL` —
the union every action needs. `access_type=offline` + `prompt=consent` on the authorize URL are
required, or Zoho omits the refresh token from the exchange response, the same requirement this pack's
other Zoho apps document for themselves.

One vendor documentation inconsistency worth naming: the `schedule-campaign` page's header block
states its required scope as `ZohoCampaigns.contact.UPDATE`, while its own "Other alternative scopes"
list for the same endpoint is entirely `campaign.*` — clearly a copy-paste error in the vendor's docs,
since scheduling acts on a campaign, not a contact. It has no functional effect on this app, since both
scope families are requested regardless.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho CRM),
`zohobooks`, `zohodesk`, `zohomail` and `zoho-invoice` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Campaigns"` — confirmed live 2026-09-05
(`"Zoho Campaigns - Operational"`, distinct from the generic Zoho umbrella entries and from every
other Zoho product's own entry on the same page).

| StatusIQ status     | Mapped state |
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
GET /api/v1.1/getmailinglists
```

The cheapest authenticated call this app knows: it needs only `ZohoCampaigns.contact.READ` and returns
nothing secret. **Unlike `zoho-invoice`, this endpoint cannot tell "no token" apart from "a dead
token"** — see above; both answer the identical `401 {"Code":"1007","message":"Unauthorized
request."}`.

### Do we have quota left?

**Declared unavailable.** Zoho Campaigns documents real rate limits, but they vary **per endpoint**
rather than per account — 500 calls/5 minutes for most reads, 100 calls/5 minutes for custom-field
creation, 2,000 calls/minute for bulk contact add, three stacked windows (500/minute, 12,500/hour,
75,000/day) for Subscribe — each with its own lock-out period once exceeded. None of that is exposed as
a *response header*: a live unauthenticated `GET /api/v1.1/getmailinglists` (and the same call with a
bad token) carries no `X-RateLimit-*` or similarly named header at all — checked live 2026-09-05.
Since the limit is per-endpoint, there is also no single number a quota check could report even if a
header existed. `health/quota.ts` states this as a positive absence with `severity: "informational"`
(required — an `unavailable` check always reports `unknown`, which outranks `ok`, so any other
severity would pin the App's verdict at `unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                   | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                      |
| ---------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | ------------------------------------------------------------ |
| `service`              | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                    |
| `quota`                | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                   |
| `auth:oauth2-<region>` | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8)  |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Icon

`assets/icon.svg` is the same generic Zoho product mark this pack's `zohobooks` and `zohodesk` apps
already ship (byte-identical path data, only the `<title>`/`aria-label` text differs), reused here
because Zoho Campaigns has **no distinct product icon** on the vendor's own site — its favicon
(`https://www.zohowebstatic.com/sites/zweb/images/favicon.ico`, confirmed live 2026-09-05) is the
generic Zoho corporate mark, not a Campaigns-specific one, and simple-icons has no `zohocampaigns`
entry (only the generic `zoho` glyph, confirmed 200 at `cdn.simpleicons.org/zoho` /
404 at `cdn.simpleicons.org/zohocampaigns`). Using the shared mark here follows the same fallback this
pack's own `zohobooks`/`zohodesk` apps already established rather than inventing a new one.

## Findings worth a day saved

1. **The API host is `campaigns.zoho.<tld>`, a dedicated legacy host — not the shared
   `www.zohoapis.<tld>` gateway every other Zoho app in this pack uses.** Assuming the gateway pattern
   points every call at the wrong host entirely. See "The API host is..." above.
2. **Every parameter — even on a documented POST — travels as a query-string value, never a JSON
   body**, the opposite of `zoho-invoice`/`zohobooks`. Getting this backwards silently drops every
   parameter rather than erroring cleanly. See "Every parameter travels..." above.
3. **Canada breaks BOTH the API host and the accounts host, not just the accounts host** like every
   other Zoho app in this pack documents. `campaigns.zoho.ca` does not resolve at all; the real host
   for both OAuth and the API is `campaigns.zohocloud.ca`/`accounts.zohocloud.ca`. See "Regional data
   centres..." above.
4. **This endpoint cannot distinguish "never configured" from "revoked/expired"** — both answer the
   identical `401 {"Code":"1007"}`, unlike `zoho-invoice`'s two distinct codes. See "No way to tell..."
   above.
5. **Three endpoints — two of them also the ones using `type=json` instead of `resfmt=JSON` — nest
   their success payload under a `"response"` key** that every other endpoint's own sample omits,
   including `sendcampaign`, which does NOT use `type=json`. See "The response envelope is
   inconsistent..." above.

---

Researched and endpoint-verified 2026-09-05 against `https://www.zoho.com/campaigns/help/developers/`
and the ~25 per-resource pages it links to (access-token, list-management and its dozen linked pages,
campaign-management and its dozen linked pages, error-codes), plus live probes against all eight
`campaigns.zoho.<tld>`-shaped API hosts, their accounts hosts, and `us.zohostatus.com`. Status surfaces
move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
