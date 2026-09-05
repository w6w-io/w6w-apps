# ERPNext

Read and write ERPNext documents — any DocType — over Frappe's generic REST
API, plus the submit/cancel document lifecycle.

- **Categories** — finance, crm, hr
- **Auth methods** — api-key (Frappe API Key/Secret pair)
- **Actions** — 10
- **Egress allowlist** — `*` (self-hosted — see below)
- **Website** — https://frappe.io/erpnext
- **API docs** — https://docs.frappe.io/framework/user/en/api/rest — read in
  full 2026-09-05. Error-envelope and status-code behaviour was verified
  directly against the framework's own source
  (`frappe/utils/response.py`, `frappe/exceptions.py`, `frappe/client.py`,
  `frappe/__init__.py`, `frappe/model/document.py`; `develop` branch, fetched
  the same day), since the REST doc page describes the request/response
  shapes but not the exception → HTTP status mapping.

## Setup

### API Key & Secret

1. Open the **User** the integration should act as (a dedicated bot User with
   only the roles the workflow needs is recommended — every call is logged
   against, and permission-checked as, that User).
2. Go to its **Settings** tab (skip if there are no tabs), expand **API
   Access**, click **Generate Keys**.
3. Copy the **API Secret** shown in the popup — it is shown once — and note
   the **API Key** field next to it.
4. Paste both, plus the site's **Site URL**, into the connection.

### Why this is the API surface, not a fixed set of "ERPNext" endpoints

Frappe — the framework ERPNext is built on — does not hand-write REST
endpoints per business object. Every Customer, Sales Order, Item, Lead or
Employee is a **DocType**, and Frappe derives one identical REST surface from
its own metadata for all of them: `GET/POST /api/resource/:doctype` for the
list and create, `GET/PUT/DELETE /api/resource/:doctype/:name` for one
document, and `GET|POST /api/method/:dotted.path` for a whitelisted Python
method. This app wraps that generic surface — list, get, create, update,
delete, count, submit, cancel — rather than guessing a fixed schema for
"Customer" or "Sales Order" that a real installation could easily have
customized away (custom fields, renamed doctypes, disabled modules).

### Why the allowlist is `*`

ERPNext is self-hosted, open-source software. Frappe Cloud is one hosting
option among several, not a fixed API host every user shares — so the site
URL is a connection field and the egress allowlist has to be open, the same
posture this pack already uses for `gitea`, `mautic`, `mattermost` and
`jenkins`.

## Actions

| Key | Type | Description |
|---|---|---|
| `list-documents` | read | List any DocType, with Frappe's filter/field/sort/paging params |
| `get-document` | read | Read one document by `name`, optionally expanding Link fields |
| `count-documents` | read | Count matching documents via `frappe.client.get_count` |
| `create-document` | perform | Create a document of any DocType |
| `update-document` | perform | Patch a document's fields (untouched fields are left alone) |
| `delete-document` | perform | Permanently delete a document (confirmation required) |
| `submit-document` | perform | Move a draft document to Submitted |
| `cancel-document` | perform | Cancel a submitted document |
| `get-logged-user` | read | The User this connection's API Key belongs to |
| `call-method` | perform | Call any other whitelisted Frappe method directly |

## The DocType-generic REST convention, and what it costs

Frappe's own docs put it in one sentence: "Frappe framework generates REST
API for all of your DocTypes out of the box." That is genuinely the whole
surface — there is no separate "ERPNext API" layered on top with
business-shaped verbs like `POST /sales-orders/confirm`. The cost of that
genericity falls on this app in two places:

1. **Field names are per-installation, not part of this app's contract.**
   `create-document`/`update-document` take a free-form `values` JSON object
   rather than typed fields for "customer name" or "grand total", because
   this app cannot know which fields a given site's `Customer` or `Sales
   Order` DocType actually has — a customization can add, remove or rename
   any of them. Discover a DocType's real field names from ERPNext's own New
   form, or by reading an existing document with `get-document`.
2. **`filters`/`or_filters` are Frappe's own array-of-triples grammar**
   (`[["fieldname", "operator", "value"], ...]`, ANDed unless placed in
   `or_filters`), not a query-string DSL this app invents. It is typed `json`
   for the same reason Odoo's domain filter is in this pack: a bare string
   invites quoting mistakes that are not valid JSON.

## Submit and Cancel are asymmetric, and the difference matters

Most transactional DocTypes — Sales Order, Purchase Order, Sales Invoice, and
most others whose list shows a Draft/Submitted/Cancelled status — move
through `docstatus` `0` (draft) → `1` (submitted) → `2` (cancelled). Both
transitions are exposed by whitelisted methods bundled with the framework
itself (`frappe.client.submit`, `frappe.client.cancel` — `frappe/client.py`),
but they take **different arguments**, verified directly against
`frappe/model/document.py`:

- **`frappe.client.submit(doc)`** takes the **whole document as a dict**,
  because `frappe.get_doc(doc)` applied to a single dict does **not** fetch
  anything from the database — it constructs a brand-new, in-memory document
  from exactly the fields the dict contains. Passing only `{"doctype": ...,
  "name": ...}` would submit a document Frappe never actually loaded, failing
  on every mandatory field the caller didn't happen to include. `Get
  Document → Submit Document` is the intended pairing.
- **`frappe.client.cancel(doctype, name)`** takes the two identifiers
  **separately**, because that two-positional-argument form of
  `frappe.get_doc` genuinely fetches the current document from the database
  first. `cancel-document` only needs a DocType and a name.

## Errors: real HTTP status codes, verified against the framework's own exceptions

Unlike some RPC-style vendors (see this pack's `odoo`, whose `/jsonrpc`
answers `200` even on failure), Frappe's REST layer sets a genuine HTTP status
code on error — `frappe/utils/response.py#report_error` does
`response.status_code = status_code` — so `res.ok` is trustworthy here.
Verified against `frappe/exceptions.py` (`develop` branch, fetched
2026-09-05):

| Exception | HTTP status | Meaning |
|---|---|---|
| `AuthenticationError` | 401 | Bad API Key/Secret pair |
| `PermissionError` | 403 | Valid credential, insufficient DocType permission |
| `DoesNotExistError` | 404 | No such document (or DocType) |
| `ValidationError` | 417 | Business-rule or mandatory-field validation failed |
| `RateLimitExceededError` | 429 | Rate limit hit |

The error body itself carries the explanation in one of three shapes,
depending on what the site allows in its response
(`frappe/utils/response.py#_make_logs_v1`): a `_server_messages` field (a
doubly-JSON-encoded array of `frappe.msgprint`/`frappe.throw` messages — the
human-authored explanation, preferred when present), an `exception` field (a
single-line traceback rendering, present when tracebacks are allowed), or an
`exc_type` field (the exception's class name). `lib/client.ts#unwrapError`
tries all three before falling back to the raw response text.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's** site reachable, and does it look like Frappe? |
| `service` | service | Declared unavailable — the question does not apply |

`instance` sends an **unsigned** `GET /api/method/frappe.auth.get_logged_user`
and reads the shape of the refusal rather than the status code alone: Frappe
has no unauthenticated version/heartbeat route, so an unsigned caller is the
built-in `Guest` user, and `get_logged_user` is whitelisted without
`allow_guest=True` — verified against `frappe/__init__.py#is_whitelisted` —
so `Guest` fails the whitelist check and gets Frappe's own fixed refusal,
`PermissionError` (**HTTP 403**), with the message "You are not permitted to
access this resource. Login to access." That refusal IS the "this is a live
Frappe site" signal, and is reported as a pass — an expired or revoked API
Secret must not make a healthy site look down. A 200 (a site with guest
access enabled broadly) also passes.

`service` is a **declared absence**. ERPNext/Frappe is self-hosted software,
so there is no vendor running the site a connection points at. Every
plausible status surface was checked live (2026-09-05) and none of them names
an operated platform: `status.erpnext.com` 404s and its TLS certificate
expired in 2023; `status.frappe.io` resolves into the Frappe Cloud dashboard
app itself, not a status page; `status.frappecloud.com` and
`frappe.statuspage.io` both answer "Your page is inactive"; and
`erpnext.statuspage.io` does resolve, but its only component is the
unclaimed Statuspage default template, literally named `"API (example)"`.
Frappe Cloud is also only one hosting option among several, so even a real
status page there would not describe most installs' own sites.

## What this app deliberately does not do

- **No typed action per business object** (no `create-customer`,
  `create-sales-order`, …). Given how customizable ERPNext's schema is per
  install, a hard-coded field list would be a guess this app refuses to ship
  — see "The DocType-generic REST convention" above.
- **Password-based session auth and OAuth2** are documented Frappe auth modes
  this app does not implement. The API Key/Secret pair needs neither cookie
  state nor a pre-configured OAuth Client, and is what Frappe's own docs lead
  with.
- **File uploads** (`/api/method/upload_file`, `multipart/form-data`) are out
  of scope for this version — every other action here is a plain JSON
  request/response, and multipart upload is a different shape this app does
  not yet carry.
- **Frappe's `/api/v2/...` surface** — a separate, opt-in API version this
  app does not target; every action here uses the unversioned
  `/api/resource` and `/api/method` paths the REST documentation describes.
