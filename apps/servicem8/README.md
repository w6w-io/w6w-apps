# ServiceM8

Field-service management for trades businesses — Jobs (Quotes, Work Orders, Completed jobs),
Clients, scheduling, staff, and the line items on a Job's Quote/Invoice — over the **ServiceM8 REST
API** (`api.servicem8.com/api_1.0`).

- **18 actions** across Jobs, Clients, scheduling (Job Activities), Quote/Invoice line items
  (Job Materials), Notes, Staff and reference data (Categories, Queues, the account itself).
- **1 auth method**: an API Key (`X-Api-Key` header).
- **2 declared health checks** plus 1 derived `auth:api-key` check.

---

## Where the reference came from

`developer.servicem8.com` is a ReadMe.io site. Every `/docs/reference*` page embeds the **complete
OpenAPI 3.1 document** in a `<script id="ssr-props" type="application/x-ssr-props">` tag — `info.title`
"ServiceM8 API", one server `https://api.servicem8.com/api_1.0`, 97 paths — alongside the one
operation that page happens to render. Fetched **2026-08-24**, together with the prose guides
published in the same sidebar section (`getting-started`, `authentication`, `http-response-codes`,
`filtering`, `pagination`, `field-types`).

**Extracting it took a fix, not just a fetch.** That `ssr-props` payload is not valid JSON as served.
Every literal double quote that belongs *inside* a string value — a quote in a curl example, in a JSON
example body — is rendered as the HTML entity `&quot;`, and the backslash that should escape it inside
the JSON text has been silently dropped. Naively HTML-unescaping the blob (`&quot;` → `"`) turns those
into bare, unescaped quotes and breaks `JSON.parse` a few thousand characters in, on every single page.
The fix is `&quot;` → `\"` — restoring the escape — applied *before* the other, ordinary entities
(`&amp;`, `&lt;`, `&gt;`, `&#39;`).

**Is the API alive?** Yes: `GET https://api.servicem8.com/api_1.0/company.json` with no credential
answers a live `401`, and the OpenAPI document is a current, populated 97-path spec, not a stub.

---

## Authentication

### API Key — `X-Api-Key: <key>`

`components.securitySchemes.apiKey` declares `{"type":"apiKey","name":"X-Api-Key","in":"header"}`,
and `docs/authentication.md`'s worked example agrees: "you must include it in all API requests by
setting it in the X-API-Key header." No ServiceM8 Developer account is needed — the key comes from
**Settings → API Keys** inside the ordinary account UI.

### An API key carries no scopes — OAuth2 does

ServiceM8 documents ~50 fine-grained OAuth scopes (`read_jobs`, `manage_customers`, `publish_sms`, …),
but every single operation's `security` block lists the bare `apiKey` scheme with an **empty** scope
requirement, alongside the scoped OAuth2 alternative. A key is all-or-nothing: there is no way to mint
a read-only or resource-limited API key the way OAuth2's scopes allow.

OAuth2 is real and documented (`Authorize: https://go.servicem8.com/oauth/authorize`,
`Token: https://go.servicem8.com/oauth/access_token`) but requires registering as a ServiceM8
**Development Partner** and being issued a per-partner App ID/Secret — a flow this app cannot verify
end-to-end without one, so it is not implemented here. `docs/authentication.md` also documents
`x-impersonate-uuid`, an OAuth-only header for acting as a specific staff member; it does not apply to
an API-key connection either, for the same reason.

### The 401 body's shape depends on whether a credential was sent AT ALL — not on whether it was right

Measured live, 2026-08-24, four requests to `GET /vendor.json`:

| Request | Status | Content-Type | Body |
|---|---|---|---|
| no header at all | 401 | `text/html` | `Authorization Required` (plain text) |
| `X-Api-Key: <garbage>` | 401 | `application/json` | `{"errorCode":401,"message":"Authorization Required"}` |
| `X-Api-Key: <different garbage>` | 401 | `application/json` | `{"errorCode":401,"message":"Authorization Required"}` |
| `Authorization: Basic <garbage>` | 401 | `text/html` | `Invalid username or password` |

Two real findings here:

1. **The plain-text vs. JSON split is real, not noise.** `sign` always sets `X-Api-Key`, so this app's
   own requests only ever see the JSON shape — but `lib/client.ts#formatServiceM8Error` still handles
   the plain-text case, because the health check's deliberately unsigned probe (`health/api.ts`) hits
   it on purpose.
2. **The message text itself doesn't distinguish "never valid" from "revoked".** Both garbage keys
   above got byte-identical JSON. `auth/api-key.ts#test` says so explicitly rather than guessing.

### An undocumented HTTP Basic-Auth fallback is live, and is deliberately NOT used here

The 401 response also carries `WWW-Authenticate: Basic realm="ServiceM8 API"`. That header is not
decorative: sending `Authorization: Basic base64(email:password)` gets the **third**, distinct body
above (`Invalid username or password`) rather than being ignored — proof the gateway actually evaluates
Basic credentials, presumably the account's own login email/password. `authentication.md` documents
only the API key and OAuth2 as current methods and says nothing about a login password being accepted
here, so this app does not implement that path: it is unconfirmed as a supported, non-deprecated
credential, and storing a user's actual account password is worse practice than an API key regardless.

---

## Actions (18)

### Jobs (5)

| Key | Endpoint |
|---|---|
| `job-list` | `GET /job.json` |
| `job-get` | `GET /job/{uuid}.json` |
| `job-create` | `POST /job.json` — `status` is the only `required` field |
| `job-update` | `POST /job/{uuid}.json` |
| `job-delete` | `DELETE /job/{uuid}.json` — **archives**, does not erase |

A `Job` is the one resource behind Quotes, Work Orders, Unsuccessful and Completed jobs — `status`
is what distinguishes them, per the REST-vs-UI naming table in `rest-overview.md`.

### Clients (4)

| Key | Endpoint |
|---|---|
| `company-list` | `GET /company.json` |
| `company-get` | `GET /company/{uuid}.json` |
| `company-create` | `POST /company.json` — `name` is the only `required` field |
| `company-update` | `POST /company/{uuid}.json` |

`Company` is the REST name for what the ServiceM8 UI calls a Client/Customer — the naming table
states this explicitly, and the operationIds (`listClients`, `getClients`, …) agree.

### Scheduling (2)

| Key | Endpoint |
|---|---|
| `jobactivity-list` | `GET /jobactivity.json` |
| `jobactivity-create` | `POST /jobactivity.json` |

A scheduled booking and a recorded time entry (check-in) are the **same** resource,
`JobActivity` — `activity_was_scheduled == 1` vs. `== 0` is what tells them apart, per
`rest-overview.md`. `JobActivityCreate` marks no field `required`, so none of `job-uuid` /
`staff-uuid` / `start-date` / `end-date` is asserted required here, though all four are what makes an
activity meaningful in practice.

### Quote/Invoice line items (2)

| Key | Endpoint |
|---|---|
| `jobmaterial-list` | `GET /jobmaterial.json` |
| `jobmaterial-create` | `POST /jobmaterial.json` — `quantity` is the only `required` field |

`JobMaterial` is the REST name for a line item on a Job's Quote or Invoice — again per
`rest-overview.md`'s own naming table.

### Notes and reference data (5)

| Key | Endpoint |
|---|---|
| `note-create` | `POST /note.json` |
| `staff-list` | `GET /staff.json` |
| `category-list` | `GET /category.json` — Job Categories |
| `queue-list` | `GET /queue.json` — Job Queues, the dispatch board's unassigned-work lanes |
| `vendor-get` | `GET /vendor.json` — the connected account's own business profile |

`vendor-get` returns the single Vendor record directly rather than the raw array `listVendors`
answers — there is exactly one Vendor per account, so a "which one" picker makes no sense.

---

## Things the reference gets subtle about

### Create and update return NO record data — only an acknowledgement plus a header

`POST /{resource}.json` (create) and `POST /{resource}/{uuid}.json` (update) both answer
`{"errorCode": 0, "message": "OK"}` — ServiceM8's generic `Result` schema, never the record's own
fields. The only thing a create response adds is the new row's id, in the **`x-record-uuid` response
header**. Every create action in this app therefore returns `{uuid}` and nothing else — following up
with the matching `*-get` action is the only way to read the fields back.

### `DELETE` archives; it does not erase

The reference's own words, on `DELETE /job/{uuid}.json`: "Job successfully archived (soft deleted)".
It sets `active` to `0` — the identical flag every list response already exposes for filtering — and
the row, plus its full history, remains reachable by a direct `GET .../{uuid}.json` and by any list
call that does not filter on `active`. `job-delete`'s description says so; nothing in this app should
be read as "gone" after calling it.

### Pagination is an opaque cursor, not a page number

`pagination.md`: send `cursor=-1` on the first request; each response holds up to **1,000 records**;
the response carries the next page's cursor in the **`x-next-cursor`** header — a UUID, never a byte
offset — and its absence means the last page was just read. There is no page-size parameter documented
for any list endpoint this app calls (only `ServiceTemplate`, out of scope, gets one), so none is
exposed.

### The OpenAPI document declares NO per-field query parameters on any list endpoint used here

`listJobs`, `listClients`, `listStaffMembers`, … all declare `"parameters": []` — literally nothing —
even though every one of their descriptions carries the identical boilerplate: "This endpoint supports
result filtering. For more information … go here." Rather than invent per-endpoint filter fields the
reference never states, every list action in this app offers the same generic trio instead:

- **`$filter`** — an OData-ish dialect `filtering.md` documents in detail: up to **10** conditions
  joined with a literal `and` (no `or`, no `not`, no parentheses — stated as hard limits), and only
  four operators, `eq`/`ne`/`gt`/`lt` (there is no `ge`/`le`). Strings are single-quoted
  (`status eq 'Work Order'`), numbers bare.
- **`$sort`** — demonstrated in `filtering.md`'s own worked example (`$sort=due_date desc`) but, unlike
  `$filter`, never named as a formal parameter on any operation — so behaviour outside that one example
  is unconfirmed.
- **`cursor`** — see pagination, above.

### An API key has no scope restriction — see [Authentication](#authentication) above.

---

## Deliberately left out, and why

- **Attachment upload.** `AttachmentCreate`'s schema is metadata only — `related_object`,
  `attachment_name`, `file_type`, `tags`, … — with **no field for the file's actual bytes**, and the
  reference does not document the separate mechanism (a signed upload URL, a second PUT, a multipart
  form) a real attachment upload needs. Rather than guess at an unstated wire format, Attachment is
  left out of this app entirely — note that `Attachment` is also the REST name for what the UI calls a
  Quote, Invoice, Work Order document *and* a Job-Diary photo, so a hand-rolled guess here would need
  to be right about all four.
- **The Webhooks API's `webhook_subscriptions` endpoint.** It appears only in `webhooks-overview.md`'s
  prose (`https://api.servicem8.com/webhook_subscriptions`, no `/api_1.0` prefix, no `.json` suffix) —
  it is **not** in the OpenAPI document at all, so its request/response shapes cannot be verified
  against a machine-readable source the way every other action here was.
- **OAuth2.** Documented and real, but requires a registered Development Partner account with a
  per-partner App ID/Secret this app has no way to obtain or verify against. See
  [Authentication](#authentication).
- **HTTP Basic Auth (email + password).** Live on the gateway (see above) but undocumented as a
  current method and worse practice to store than an API key.
- Every other resource the OpenAPI document lists but this app does not touch — Assets, Forms,
  Documents/Templates, Suppliers, Tax Rates, Security Roles, SMS/Email history, the Feed and Custom
  Fields APIs, Service Templates, Knowledge Articles, Inbox Messages. All are fully documented and
  correct to add later; none was blocked by anything, they were simply scoped out of this first
  version to keep it to the core Job/Client/schedule/material workflow.

---

## Health checks

| Check | Kind | Severity | What it reads |
|---|---|---|---|
| `service` | `service` | `informational` | declared absence — no status page exists |
| `api` | `dependency` | default | unsigned `GET https://api.servicem8.com/api_1.0/vendor.json` |
| `auth:api-key` | derived | — | projected from the `test` hook |

### `service` — no genuine status page exists

Checked three ways, 2026-08-24:

- **`servicem8.statuspage.io`** (the guessable Atlassian Statuspage subdomain) is **unclaimed**:
  `GET /api/v2/summary.json` 302-redirects to `https://www.statuspage.io`, Atlassian's own marketing
  site.
- **`servicem8.freshstatus.io`** answers `200`, but the body is Freshstatus's own generic "page does
  not exist" catch page (containing the literal strings "Freshstatus" and "does not exist"), not a
  ServiceM8 status page.
- Neither `www.servicem8.com` nor `developer.servicem8.com` link to a status page anywhere in their
  markup.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, which
outranks `ok` in a roll-up, so at any other severity this declared absence would pin the app's verdict
at `unknown` forever.

### `api` — a 401 with ServiceM8's own plain-text body is the pass

With no status page to lean on, an unsigned request to `api.servicem8.com` is the only external signal
available. Measured live, 2026-08-24:

```
HTTP/2 401
content-type: text/html; charset=UTF-8
www-authenticate: Basic realm="ServiceM8 API"
Authorization Required
```

That plain-text 401 is the strongest evidence the service is up: DNS resolved, TLS terminated through
CloudFront, the router matched `/vendor.json`, and the authentication gate ran and answered in its own
documented shape. A body that isn't exactly `Authorization Required` means something other than the
ServiceM8 API answered; a 2xx would mean the credential requirement had regressed (`degraded`, not a
pass); a 404/5xx means the route or backend is broken (`down`). This check carries no credential and
says nothing about anybody's key — that is `auth:api-key`'s job. No `quota` check exists because
ServiceM8 publishes no rate-limit response header at all, only the flat 180/minute + 20,000/day
ceiling stated in prose.

---

## Icon

`assets/icon.png` — ServiceM8's own 256×256 `apple-touch-icon.png`, downloaded verbatim from
`https://cdn.prod.website-files.com/57d7ef8b3d16a9a554f037bf/57d7ef8c3d16a9a554f03886_webclip.png`
(linked from `www.servicem8.com`'s own `<link rel="apple-touch-icon">`) on 2026-08-24: the green
rounded-square mark with the white interlocking-circles glyph. Used as a raster via the `url` slot
(`appearance.icon.url`) rather than `svg`, because no true vector of this mark was found on
`servicem8.com` or `developer.servicem8.com` — only this PNG and a 32×32 favicon of the same artwork.

---

## Development

```bash
# from packages/apps/apps/servicem8 (Deno lives in the api container)
deno task validate   # manifest + spec conformance
deno task check      # typecheck
deno task lint
deno task fmt
deno task test
```

The unit tests call every hook with a mocked `HookContext` — a fake `ctx.fetch` that queues responses
and records requests, and a no-op `ctx.log`. No network, no server.
