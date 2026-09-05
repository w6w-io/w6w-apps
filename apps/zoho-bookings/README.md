# Zoho Bookings

List workspaces, services and staff, check availability, and book, get, update, reschedule and
cancel appointments in Zoho Bookings — appointment scheduling software.

Scoped to **Zoho Bookings specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
and `zohodesk`, separate products with separate API surfaces — do not confuse the four, and do not
modify `apps/zoho/`, `apps/zohobooks/` or `apps/zohodesk/` from here.

- **Categories** — calendar
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 9
- **Egress allowlist** — `www.zohoapis.com`, `www.zohoapis.eu`, `www.zohoapis.in`,
  `www.zohoapis.com.au`, `www.zohoapis.jp`, `www.zohoapis.ca`, `www.zohoapis.com.cn`,
  `www.zohoapis.sa`
- **Website** — https://www.zoho.com/bookings/
- **API docs** — https://www.zoho.com/bookings/help/api/v1/ (see "Sourcing" below — `www.zoho.com`
  answers a bare `403` to this container's direct requests, so every page cited here was fetched
  through the Wayback Machine instead)

## Actions

| Resource     | Actions                                                          |
| ------------ | ----------------------------------------------------------------- |
| Workspace    | list                                                              |
| Service      | list                                                              |
| Staff        | list, add                                                         |
| Availability | list (available slots for a service on a date)                   |
| Appointment  | book, get, update status (complete/cancel/no-show), reschedule    |

This is every endpoint Zoho documents for the Bookings v1 API — there is no customer/contact list,
recurring-appointment, payment/checkout or resource (room/equipment) management endpoint published,
so none of those are attempted. If Zoho adds one and documents it, `lib/client.ts`'s
`ZohoBookingsClient` covers it with a thin new action file, the same way the nine here were built.

## The API is JSON-RPC-shaped, not resource-per-path REST

Every documented endpoint hangs a verb-shaped segment off one fixed prefix —
`/bookings/v1/json/services`, `/bookings/v1/json/getappointment`,
`/bookings/v1/json/updateappointment`, ... — rather than a `/{resource}/{id}` shape. There is no
`/organizations`-equivalent discovery call this app can rely on for regional confirmation the way
`zohobooks` does; `afterConnect` confirms the region by calling `/workspaces` instead.

## Write endpoints take `multipart/form-data`, not JSON

Book/Update/Reschedule Appointment and Add Staff are all documented with a `curl --form` sample —
several of the form fields are themselves JSON-encoded strings (`customer_details`,
`additional_fields`, `payment_info`), and Add Staff's entire payload travels under one field,
`staffMap`. Every action that writes builds a `FormData` body, mirroring this pack's `zohodesk`
attachment-upload action (the established multipart pattern in this codebase) rather than the
JSON-body convention `zohobooks`/`zoho` (CRM) use for their own create/update calls.

`appointment-book`'s `customer_details` (name/email/phone — a fixed, small shape) is exposed as
three friendly params (`customerName`/`customerEmail`/`customerPhone`) rather than a raw JSON blob,
since the field set is bounded and documented. `additional_fields` stays a raw JSON param, because
those field names are configured per Zoho Bookings account and this app cannot know them in advance.

## A single OAuth scope covers the whole API

`zohobookings.data.CREATE` is the **only** scope Zoho documents for this product — despite the
`.CREATE` suffix it is described as "Grants permission to perform supported actions in Zoho
Bookings," i.e. it is not read-only. Unlike `zohobooks`/`zoho` (CRM), which each expose several
per-resource scopes (`.ALL`/`.READ`/...), there is no narrower grant to request here.

## Regional data centres (all eight) — same shape, and the same Canada quirk, as `zohobooks`/`zohodesk`

Zoho hosts every account in one of **eight** regional data centres — United States, Europe, India,
Australia, Japan, Canada, China, Saudi Arabia — each with its own API host (`www.zohoapis.<tld>`,
confirmed against Bookings' own
[domain-specific API URLs page](https://www.zoho.com/bookings/help/api/v1/domain-specificapiurls.html))
and (almost always) its own OAuth host (`accounts.zoho.<tld>`, the platform-wide login
infrastructure shared by every Zoho product — not documented per-product, so this app reuses the
exact accounts hosts `zohobooks`/`zohodesk` already verified live rather than re-deriving Zoho's
central login system from scratch).

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific accounts host before any in-flow field could be read), a single `oauth2` auth method with
a "data centre" selector cannot express this — `auth/oauth2.ts` declares **one `AuthDefinition` per
data centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-ca`,
`oauth2-cn`, `oauth2-sa`). The user picks the method matching their account's data centre when
connecting, and `w6w.network.allow` lists every corresponding API host.

**Canada is the one region where the accounts host does not follow the API host's naming pattern.**
Bookings' own domain table gives the Canadian API base as `https://www.zohoapis.ca/bookings/` — the
same `www.zohoapis.<tld>` shape as the other seven — but there is **no** `accounts.zoho.ca`. Probed
live from this container on 2026-09-05: `https://accounts.zoho.ca/oauth/v2/auth` fails to connect
at all, while `https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the
Zoho login page) — the identical finding `zohobooks`/`zohodesk` document for their own products.
`oauth2-ca` uses `accounts.zohocloud.ca` deliberately.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the first workspace's `workspaceId`/`primaryWorkspaceName` when
reachable (Zoho Bookings' workspace list carries no "default" flag the way Zoho Books' organizations
do — this is simply the first entry returned). `lib/client.ts#apiHostFromConnection` and
`#workspaceIdFrom` read them back, so `service-list` (the one endpoint that truly requires a
workspace id) needs nothing typed in for a single-workspace account.

## An auth failure answers a generic HTML gateway page, not the documented JSON envelope

This is the one place this app deviates from "classify a credential failure from the response body,
never the status code alone." Live-probed 2026-09-05 against
`https://www.zohoapis.com/bookings/v1/json/workspaces`:

| Request                                  | HTTP  | Body                                                      |
| ----------------------------------------- | ----- | ---------------------------------------------------------- |
| No `Authorization` header at all          | `400` | `text/html`, ~1.6 KB, "Zoho Creator - Error Page"           |
| `Authorization: Zoho-oauthtoken garbage`  | `401` | Byte-identical HTML page, only the status code differs      |

Both cases render a generic "Something went wrong... contact support@zohobookings.com" page — the
`support@zohobookings.com` address confirms this really is the Bookings backend and not a decoy,
but it gives no structured field to classify by, unlike `zohobooks` (`{"code":14}` / `{"code":57}`)
or `zohodesk` (`{"errorCode":"UNAUTHORIZED"}` / `{"errorCode":"INVALID_OAUTH"}`). `auth/oauth2.ts`'s
`test` hook therefore falls back to the HTTP status itself — 400 = no usable token reached the
request, 401 = a token reached it and was rejected — because there is nothing else to read. A
successful response (`res.ok` **and** a JSON content-type) is still classified by the vendor's own
`response.status` field, not by HTTP status alone.

## Add Staff's response has no `returnvalue`/`status` wrapper at all

Every other endpoint answers `{"response": {"returnvalue": ..., "status": "success", "logMessage":
[]}}`. Add Staff instead answers a bare `{"response": [...]}` array — one entry per staff member
submitted — whose per-item `status` field is `"success"` **or** an error description such as
`"Staff already exists"`, even on an otherwise-2xx response (the vendor's own documented "Possible
Errors" section describes this exact shape). `lib/client.ts#unwrapStaffAddResult` turns a
non-success per-item status into a thrown error, the same "a 2xx can still carry a per-item failure"
discipline this pack's `zoho` (CRM) app applies to its own batch-style create/update/delete/convert
responses.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (CRM),
`zohobooks` and `zohodesk` apps read.

```
GET https://us.zohostatus.com/rss
```

Confirmed live 2026-09-05: the feed carries a `"Zoho Bookings - Operational"` entry, distinct from
the neighbouring `"Zoho Books - Operational"` entry — the two products are easy to conflate by name
but are separate components. `health/service.ts` matches the component name **exactly**, so
`"Zoho Books"` can never satisfy a check looking for `"Zoho Bookings"`.

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

Each `oauth2-<region>` method's `test` hook — the app's own health check, derived per region into
`auth:oauth2-us`, `auth:oauth2-eu`, etc.

```
GET /bookings/v1/json/workspaces
```

The cheapest authenticated call this app knows — no scope beyond the single one this app already
requests, and it needs no id at all (it's how a workspace id is discovered). See "An auth failure
answers a generic HTML gateway page" above for why this is the one check in this app that falls back
to HTTP status rather than a vendor error code.

### Do we have quota left?

**Declared unavailable.** Zoho Bookings documents a real per-user/per-day request limit by plan
(Free 250, Basic 1000, Premium/Zoho One 3000) but exposes no `X-RateLimit-*` (or equivalent)
response header — checked live 2026-09-05 against both an unauthenticated and an invalid-token call
to `www.zohoapis.com`. `health/quota.ts` states this as a positive absence with
`severity: "informational"` (required — an `unavailable` check always reports `unknown`, which
outranks `ok`, so any other severity would pin the App's verdict at `unknown` forever).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                      |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | ------------------------------------------------------------ |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                    |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                   |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8)  |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks.

## The icon is reused byte-for-byte from `apps/zoho`

Per this pack's convention for a shared vendor mark, `assets/icon.svg` is copied verbatim from
`apps/zoho/assets/icon.svg` rather than re-sourced — same vendor, same mark. Its embedded
`aria-label`/`<title>` still reads **"Zoho CRM"**, a byte-for-byte artifact of that reuse, not a
mistake specific to this app; `w6w.appearance.icon.alt` in `package.json` is set to "Zoho Bookings"
so the manifest-level accessibility text is correct even though the SVG's own internal label is not.

## Findings worth a day saved

1. **The write endpoints expect `multipart/form-data`, not JSON**, despite the API otherwise being
   JSON in and out (`/v1/json/...` paths, `Response Type: JSON` on every page) — sending a JSON body
   to Book/Update/Reschedule Appointment or Add Staff does not match any documented sample request.
2. **An auth failure gives no JSON body to read at all** — a generic "Zoho Creator" HTML gateway page
   for both a missing and an invalid token, distinguished only by HTTP status (400 vs 401). Every
   other Zoho product in this pack (CRM, Books, Desk) returns a structured error code even when
   unauthenticated; Bookings does not. Building a `test` hook that expects one and silently
   swallows a JSON-parse failure would misreport every credential problem as "unknown."
3. **Add Staff's success envelope has no `status`/`returnvalue` field** — a bare array whose
   per-item `status` can itself be the string `"success"` or a human error message, so a check for
   `res.ok` alone reports "Staff already exists" as a successful add.

---

## Sourcing

`www.zoho.com` answers a bare `403 Forbidden` to this container's direct requests to every
`/bookings/help/api/v1/*.html` path (verified 2026-09-05, with and without a browser `User-Agent`),
so every API-reference page cited above was instead fetched through the Wayback Machine's `id_`
raw-capture mode, using the most recent snapshot of each page (`generate-accesstoken.html`
2026-06-07, `oauthauthentication.html` 2026-05-20/2026-08-13, `domain-specificapiurls.html`
2025-07-09, `fetch-workspaces.html` 2026-06-11, `fetch-services.html`/`fetch-staff.html` 2026-05-09,
`fetch-availability.html`/`book-appointment.html`/`get-appointment.html` 2025-11-20/2025-12-06,
`update-appointment.html`/`reschedule-appointment.html` 2026-02-18/2026-02-19, `add-staff.html`
2023-07-30 — the oldest of the set, but Add Staff's shape has no newer capture in the CDX index and
nothing in the live probes below contradicted it). Every host, path, header shape and status/content
type claim attributed to a **live** measurement in this README and the source comments was instead
run directly from this container against the real `www.zohoapis.<tld>` / `accounts.zoho*` hosts on
2026-09-05, not inferred from the archived docs. Status surfaces and vendor error shapes move —
re-verify if a probe starts failing for everyone at once.
