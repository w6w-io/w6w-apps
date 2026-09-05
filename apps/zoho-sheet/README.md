# Zoho Sheet

Read and write Zoho Sheet workbooks, worksheets, rows and ranges.

Scoped to **Zoho Sheet specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks` and
`zohodesk`, separate products with separate API surfaces — do not confuse them, and do not modify
those apps from here.

- **Categories** — spreadsheets, productivity
- **Auth methods** — oauth2, one per Zoho data centre (see below) — **seven**, not eight
- **Actions** — 10
- **Egress allowlist** — `sheet.zoho.com`, `sheet.zoho.eu`, `sheet.zoho.in`, `sheet.zoho.com.au`,
  `sheet.zoho.jp`, `sheet.zoho.com.cn`, `sheet.zoho.sa`
- **Website** — https://www.zoho.com/sheet/
- **API docs** — https://www.zoho.com/sheet/help/api/v2/

## Actions

| Resource | Actions                                            |
| -------- | --------------------------------------------------- |
| Workbook | list, create                                       |
| Sheet    | list, create, delete                               |
| Rows / ranges | read, append (JSON), write (CSV), clear content, get used area |

Every path, parameter and response shape here was verified live 2026-09-05 against Zoho's own API
Playground (see "Researched and verified" below) — not inferred from another Zoho app or a
third-party integration directory.

Deliberately absent: tabular "Data Store" table operations (a worksheet modeled as a database table
with typed criteria filters — a genuinely different mental model that deserves its own design rather
than a bolt-on), pivot tables, charts, format/conditional-formatting, mail-merge, named
ranges/data-validation/picklists, and workbook sharing/versioning/publish/upload/download. None of
those are core spreadsheet CRUD automation, and several (tabular, pivot, charts) are large enough
surfaces to warrant their own action set later rather than a partial one now.

## The API host is `sheet.zoho.<tld>` — the docs page's own banner text is wrong

Zoho's API Playground page (`https://www.zoho.com/sheet/help/api/v2/`) displays a static banner
reading `API URL https://docs.zoho.com/sheet/api/v2/<resource_id>`. That host is stale copy shared
with Zoho Writer/Docs (which really do use `docs.zoho.com` for their own, structurally identical,
API) and was never updated for Sheet. The page's own JavaScript — the code that actually builds its
"Sample Request" panel — hardcodes `defaultAPIUrl = "https://sheet.zoho.com/api/v2/"`, and a live
probe confirms only `sheet.zoho.com` serves this API; `docs.zoho.com/sheet/api/v2/...` does not.
Trusting the visible banner over the code driving the page would have pointed every request in this
app at a host that doesn't run the Sheet API at all.

## Almost every call is JSON-RPC-over-POST, addressed by workbook id

Two operations address a fixed path because they don't yet have a workbook to act on:
`workbook.list` at `POST /api/v2/workbooks`, and `workbook.create` at `POST /api/v2/create`. Every
other operation — every worksheet and content/range operation this app exposes — addresses
`POST /api/v2/<resource_id>`, where `resource_id` is the workbook's id (returned by
`workbook-list`/`workbook-create`) and the actual operation is named by a `method` form field
(`worksheet.list`, `worksheet.content.get`, `range.content.clear`, ...), confirmed from the
Playground's own generated curl sample:

```
curl 'https://sheet.zoho.com/api/v2/<resource_id>' \
  -H 'Authorization: Zoho-oauthtoken $oauthtoken' \
  -d 'method=worksheet.content.get&worksheet_name=Sheet1&...' \
  -X POST
```

**Every call is a POST**, including reads like `workbook.list` and `worksheet.content.get` — there
is no separate GET-shaped read path. Parameters go into an `application/x-www-form-urlencoded` POST
body; a JSON-array/object-typed parameter (`json_data`, ...) is `JSON.stringify`-ed and sent as that
one field's value, not as the request body itself.

## The error envelope is flat, and distinct from the success envelope

A success answers `{"status": "success", "method": "...", ...}`. A failure answers
`{"error_message": "...", "error_code": <number>}` with a non-2xx HTTP status and **no** `status`
field at all. Confirmed live against `sheet.zoho.com`:

| Request                                  | HTTP | `error_code` | Message                                                        |
| ------------------------------------------ | ---- | -------------- | ------------------------------------------------------------------ |
| No `Authorization` header at all           | 401  | 2401           | `Valid [authorization ticket] is required for processing the request.` |
| `Authorization: Zoho-oauthtoken garbage`   | 401  | 2401           | `Valid [OAUTHTOKEN] is required for processing the request.`       |

Zoho gives **one** code for both cases here — unlike Zoho Books' `14`/`57` split — so
`auth/oauth2.ts`'s `test` hook can report that the credential didn't work, but not which flavor of
not-working it was.

## Regional data centres — seven, not eight

Zoho hosts every account in one of several regional data centres, each with its own OAuth host
(`accounts.zoho.<tld>`) and its own Sheet API host (`sheet.zoho.<tld>` — a per-product subdomain, the
same convention this pack's `zohomail` app documents, rather than CRM/Books' shared
`www.zohoapis.<tld>`). Because the OAuth authorization/token host is baked into the flow itself (the
browser is redirected to a specific accounts host before any in-flow field could be read),
`auth/oauth2.ts` declares **one `AuthDefinition` per data centre** (`oauth2-us`, `oauth2-eu`,
`oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-cn`, `oauth2-sa`) rather than one method with a "data
centre" field — the user picks the method matching their account's data centre when connecting.

**Zoho Sheet has no Canadian API host at all** — verified live 2026-09-05:

- `sheet.zoho.ca` fails DNS resolution outright (not a TLS/HTTP error — the name simply doesn't
  resolve).
- `www.zohoapis.ca/sheet/api/v2/workbooks` (the CRM/Books-style host, on the chance Sheet piggybacks
  on it in that one region) answers `404 API endpoint not found` — a real, structured negative, not a
  network failure.

This is a genuine product gap, not a naming mismatch to work around the way `zohobooks` works around
Canada's `accounts.zohocloud.ca` vs `accounts.zoho.ca` mismatch — there is simply no Sheet API host to
route Canadian accounts to, so this app offers no `oauth2-ca` method at all.

The other seven `sheet.zoho.<tld>/api/v2/workbooks` endpoints were probed unauthenticated on
2026-09-05 and every one answered the identical documented shape:

```
401 {"error_message":"Valid [authorization ticket] is required for processing the request.","error_code":2401}
```

Every `accounts.zoho.<tld>/oauth/v2/auth` host answered `302` for a syntactically valid authorize
request, same day.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho
CRM), `zohobooks` and `zohodesk` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Sheet"` — confirmed live 2026-09-05 (`"Zoho Sheet -
Operational"`, distinct from the generic Zoho umbrella entries and other Zoho Office Suite components
on the same page).

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
POST /api/v2/workbooks
method=workbook.list&count=1
```

The cheapest authenticated call this app knows: it needs only `ZohoSheet.dataAPI.READ` and no
`resource_id` at all, since it's how a workbook is discovered. It also returns nothing secret.
Classified by the vendor's own `error_code`, not by HTTP status alone — see the error table above;
both failure shapes share `error_code: 2401`, so a failing `test` reports the code but not which
underlying cause it was.

### Do we have quota left?

**Declared unavailable.** Zoho Sheet documents a per-method, per-minute call ceiling ("As of now
there is no daily or monthly usage limit for Zoho Sheet APIs, but we have a limitation on per minute
API calls to avoid overloading our server. If that limit is exceeded, APIs on that document will not
work for the next 5 minutes.") with published per-operation ceilings (20/30/60/120 calls/minute,
depending on the method) — but none of that is exposed as a *response header*. A live authenticated
`POST /api/v2/workbooks` (and the same call with a bad token) carries no `X-RateLimit-*` or similarly
named header at all — checked 2026-09-05. `health/quota.ts` states this as a positive absence with
`severity: "informational"` (required — an `unavailable` check always reports `unknown`, which
outranks `ok`, so any other severity would pin the App's verdict at `unknown` forever) rather than
leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (7)   |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Icon

`assets/icon.svg` is reused byte-for-byte from this pack's `zoho` (Zoho CRM) app — same vendor, same
mark, per this app's build instructions, rather than re-sourced. It still carries that sibling app's
`"Zoho CRM"` `aria-label`/`<title>` rather than a Sheet-specific one; the mark itself (the interlocked
blue rings) is Zoho's shared corporate logo, not a CRM-specific one.

## Findings worth a day saved

1. **The docs page's own banner names the wrong host.** `https://docs.zoho.com/sheet/api/v2/...` is
   stale copy from a shared Writer/Docs template; the real host, confirmed from the page's own
   request-building JavaScript and a live probe, is `sheet.zoho.<tld>`. See "The API host is
   `sheet.zoho.<tld>`" above.
2. **There is no Canadian Sheet API host.** `sheet.zoho.ca` doesn't resolve, and the CRM/Books-style
   fallback host (`www.zohoapis.ca`) answers a real 404 for the Sheet path rather than serving it
   under a different name — this app offers six regions plus a US default (seven total), not eight.
   See "Regional data centres" above.
3. **Every call, including reads, is a POST with the real operation named in a `method` body field,
   not in the URL.** Building this app by REST convention (GET for a list, a per-operation path) would
   have produced requests Zoho's API doesn't accept. See "Almost every call is JSON-RPC-over-POST"
   above.

---

Researched and endpoint-verified live 2026-09-05 against `https://www.zoho.com/sheet/help/api/v2/`
(the Playground's own request-driving JS payload, not just its rendered banner text) plus live probes
against all seven working regional API hosts, the excluded Canadian host, their accounts hosts, and
`us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a
probe starts failing for everyone at once.
