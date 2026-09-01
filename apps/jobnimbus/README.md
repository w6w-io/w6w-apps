# JobNimbus

Contacts, jobs, tasks and notes on **JobNimbus**, the field-service CRM built for roofing and other
exterior/home-services contractors, over its "Open API."

- **Categories** — crm
- **Auth methods** — bearer-token
- **Actions** — 14
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:bearer-token`
- **Egress allowlist** — `app.jobnimbus.com` (the `service` check adds `status.jobnimbus.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.jobnimbus.com/
- **API docs** — https://documenter.getpostman.com/view/3919598/S11PpG4x (see below for how this was
  found)
- **Status page** — https://status.jobnimbus.com/

> **Everything below was verified against JobNimbus's own sources on 2026-09-01** — the Postman
> collection above, plus live probes against `app.jobnimbus.com` and `status.jobnimbus.com`. Nothing
> here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. There is no `developers.jobnimbus.com`

The obvious guess for a vendor dev-docs host does not resolve (`NXDOMAIN`, checked live). JobNimbus's
own marketing site (`jobnimbus.com`) 403s a plain unauthenticated fetch and its sitemap lists no
`/api` or `/developer` page. The only path to the real API reference runs through JobNimbus's own
**support center**: the article "How Do I Use JobNimbus' Open API? (API Documentation)"
(`support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api`) links the Postman
collection above as the sole reference — and warns, in JobNimbus's own words, "JobNimbus does not
recommend building a custom API unless you have experience with coding."

A second, separate host — `api.jobnimbus.com` — **does** resolve, to a bare AWS API Gateway that
answers `{"message":"Not Found"}` on every path tried (root, `/v1`, `/contacts`, ...). It is not the
same deployment as this app's base URL and is not used here.

### 2. "Delete" is a soft-delete `PUT`, not a `DELETE`

JobNimbus's collection documents only `GET`, `PUT` and `POST` — there is no `DELETE` verb anywhere in
it. What it calls "Delete a Contact" / "Delete a Job" / "Delete a Task" is
`PUT .../<jnid>` with body `{"is_active": false}`: the record is deactivated, not removed, and its
history stays intact (reactivate it by flipping `is_active` back to `true` through the corresponding
Update action). `contact-delete` and `job-delete` in this app are that call by an honest name; both
are marked `idempotent: true`.

### 3. No rate-limit signal exists anywhere — not on the wire, not in the docs

A live 401 from `app.jobnimbus.com` (the same host every action calls) carries no `X-RateLimit-*` or
`RateLimit-*` header of any kind, checked signed and unsigned. The vendor's own "Getting Started"
documentation covers the base URL, auth, common query parameters and the filter/query syntax in
detail and says nothing about throttling or call ceilings anywhere in its text. `health/quota.ts`
declares this as an absence rather than guessing at one.

## Auth

One method: `bearer-token`, type `bearer` — `Authorization: Bearer <token>`.

The token is a single static **API Key**, minted from JobNimbus Settings > Integration Settings >
API > New API Key, and scoped by an assignable **Access Profile**. There is no OAuth surface; this
static key is the entire authentication story, the same mechanism JobNimbus's own catalogued
integrations (BirdEye, CompanyCam, Zapier, ...) use. JobNimbus's own Postman example writes the header
value as `bearer <token>` (lowercase scheme); this app sends `Bearer <token>` — HTTP authentication
schemes are registered case-insensitively (RFC 7235 §2.1), so both are the same wire value to a
spec-conformant server.

### The probe is `GET /contacts?size=1`

An Access Profile decides which record types and settings a token can reach, and JobNimbus's own docs
only *recommend* — do not require — "Full and Settings access" for an integration's key. The probe
therefore reads Contacts, this app's most basic CRM object and the one an Access Profile is least
likely to have been scoped away from, rather than an account/settings endpoint that a
Contacts-and-Jobs-only key could be legitimately refused. The response is JobNimbus's ordinary list
envelope, `{"count", "results"}` — no credential material of any kind.

A missing token and a syntactically-plausible-but-wrong one produce the **byte-identical** body,
confirmed live:

```json
{ "status": 401, "body": "Authentication required" }
```

There is no finer-grained code to tell those two cases apart, and `auth/bearer-token.ts`'s `test`
hook says so in its failure message rather than guessing which one happened.

## Actions

14 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `contact-get` | read | `GET /contacts/{jnid}` |
| `contact-list` | read | `GET /contacts` |
| `contact-create` | perform | `POST /contacts` |
| `contact-update` | perform | `PUT /contacts/{jnid}` |
| `contact-delete` | perform | `PUT /contacts/{jnid}` (`is_active: false`) |
| `job-get` | read | `GET /jobs/{jnid}` |
| `job-list` | read | `GET /jobs` |
| `job-create` | perform | `POST /jobs` |
| `job-update` | perform | `PUT /jobs/{jnid}` |
| `job-delete` | perform | `PUT /jobs/{jnid}` (`is_active: false`) |
| `task-list` | read | `GET /tasks` |
| `task-create` | perform | `POST /tasks` |
| `activity-list` | read | `GET /activities` |
| `activity-create` | perform | `POST /activities` |

### Idempotency

The four **creates** each start a new record on every call — `contact-create`, `job-create`,
`task-create`, `activity-create` — and are `idempotent: false`. The four **updates and deactivations**
converge to the same state on repetition — `contact-update`, `contact-delete`, `job-update`,
`job-delete` — and are `idempotent: true`. `task-create` and `activity-create` have no update/delete
counterpart in this app's covered surface.

### Notes on individual actions

- **List actions share one param set** (`lib/params.ts`): `size` (default 50; JobNimbus's own
  default is 1000, its documented maximum), `from` (offset pagination), `sort_field`/`sort_direction`,
  and `filter` — JobNimbus's own Elasticsearch-syntax query object, passed through as URL-encoded
  JSON. `task-list`/`activity-list` can be scoped to one contact or job via
  `filter: {"must":[{"term":{"related.id":"<jnid>"}}]}`, per JobNimbus's own documented example.
- **Every action accepts an optional `actor` (email).** Documented on every JobNimbus endpoint: when
  the API Key's Access Profile has admin-level permissions, `actor` makes the call inherit a specific
  team member's permissions and attribution — a created record's "Created By" becomes them, and a
  `GET` returns only what that person can see. It is a per-call param here, not folded into the
  credential, because it varies per call rather than per Connection.
- **`record_type_name`/`status_name` name customer-configured workflow states**, not a fixed enum —
  JobNimbus lets each account define its own Contact/Job workflows (e.g. "Customer" > "Lead") in
  Settings, so this app takes them as free-text strings rather than a static `select`.
- **`job-create`/`job-update` expose `primary_contact_jnid`**, a plain string this app expands into
  the nested `"primary": {"id": "<jnid>"}` shape JobNimbus's own example uses to link a job to its
  contact.
- **`task-create`/`activity-create` expose `related_jnid`/`related_jnid`** the same way, expanding to
  `"related": [{"id": "<jnid>"}]` (tasks) or `"primary": {"id": "<jnid>"}` (activities) — JobNimbus
  uses different field names for the same relationship on these two entities, confirmed from its own
  examples rather than assumed to match.
- **Every create/update action exposes an `extra` (`json`) catch-all** for fields this app does not
  model by name — custom fields (`cf_string_1`, ...) and anything else documented but not surfaced as
  its own param — merged into the request body and able to override a modeled field on key collision.
- **`contact-create`/`job-create` require at least one identifying field** (JobNimbus's own note: First
  Name, Last Name, Display Name or Company Name for a contact) plus `record_type_name` and
  `status_name`; this app does not duplicate that validation client-side and lets JobNimbus's own 4xx
  response report a missing one.

## Health checks

Two declared checks plus the derived `auth:bearer-token`.

### `service` — the status page is real, checked three ways, and keyed on the right component

**(a) It answers real JSON, not an unclaimed-page shell.** `GET /api/v2/summary.json` returns 200 with
6,889 bytes of Statuspage v2 JSON; `GET /api/v2/status.json` returns a 234-byte page-level summary.

**(b) It self-identifies.** `"page": {"id": "r8kw327v6276", "name": "JobNimbus", "url":
"https://status.jobnimbus.com"}`.

**(c) One of its eleven components is named exactly for this app's surface** —
`kc7n6zfckydv` / "Public API - Application Programming Interface." This check keys its verdict on
*that* component rather than the page-level indicator: on the day this was verified, the page-level
indicator read `minor` ("Partially Degraded Service") purely because "Web Application Performance" was
degraded, while the Public API component itself was `operational`. Following the page-level roll-up
would have reported this app's actual dependency as degraded when it was not. The other ten components
(Login, Email in/out, Mobile Application Performance, Engage, QuickBooks Integration, Receiving
Payments, Partner Integrations, ...) are reported for visibility but do not drive `state`.

Severity is left at the `degraded` default: JobNimbus is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### ~~`quota`~~ — a declared absence, at `informational` severity

See "The three things most likely to cost someone a day" above. `severity: "informational"` is
load-bearing: an `unavailable` entry always reports `unknown`, which outranks `ok` in the roll-up, so
at any other severity this would pin the app's verdict at `unknown` forever.

## Deliberately not covered

JobNimbus's Postman collection documents a considerably wider surface than Contacts/Jobs/Tasks/
Activities. Left out, and why:

- **Files** — both the "Deprecated" single-call form and the current presigned-URL, multi-step
  upload flow (`files/v1/uploads/url` -> `PUT` the presigned URL -> `.../complete`). The presign step
  answers on a **different host** (`api.jobnimbus.com`, `http://` in the vendor's own collection for
  one of the two upload endpoints) this app has not verified as production-ready, and the multi-step
  choreography does not fit a single Action cleanly. Left out for scope and unresolved host ambiguity,
  not because it could not be found.
- **Products, MaterialOrders, WorkOrders, Estimates (Legacy), Invoices** — all real, documented `/v2/`
  resources with full CRUD. Left out for scope: this app covers the core CRM objects (Contacts, Jobs,
  Tasks, Activities) the task asked for.
- **Payments** — `GET /api1/payments` but `POST` to create one is on yet another host,
  `app.jobnimbus.com/api2/v2/payments`, undocumented beyond the one collection entry. Left out rather
  than guessed at.
- **Budgets (Legacy)** — one read-only, undocumented-beyond-a-URL endpoint (`GET /api1/budgets`).
  Left out for scope.
- **Account/workflow configuration** — Account Settings, Group Information, Users/Team Members, UoMs,
  and the `POST /account/{workflow,leadsource,customfield,filetype,tasktype,activitytype,location}`
  family that provisions an account's own picklists and workflows. These configure the JobNimbus
  *account itself* rather than its records, and are a different kind of integration (admin
  provisioning, not CRM data flow) than this app's action set. Left out for scope.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
Postman collection cited at the top of this file.

## Icon

`assets/icon.svg` wraps `https://app.jobnimbus.com/images/favicon.png`, downloaded verbatim on
2026-09-01 — 512x512 PNG, 2,152 bytes, the "JN" mark (white curved glyph on JobNimbus blue). JobNimbus
publishes no SVG mark on either its marketing site or its app host, so this follows the pack's
existing precedent for that case — wrapping the vendor's own raster asset in an `<svg><image>`
container rather than hand-tracing a vector that does not exist (see `dialpad`, `apollo`, `blandai`,
`gorgias`, `kustomer`). It is not run through `_tools/icon-normalize.ts`, matching those apps: that
tool re-frames genuine vector artwork onto the pack's shared canvas, and a wrapped raster already
fills its own square.

## Layout

```
jobnimbus/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # JobNimbusClient, error formatting, list/single/deactivate
│   └── params.ts                 # shared list params (size/from/sort/filter) and `actor`
├── auth/bearer-token.ts          # bearer API key: sign, test
├── actions/                      # one file per action (14)
├── health/
│   ├── service.ts                # status.jobnimbus.com, keyed on the Public API component
│   └── quota.ts                  # declared absence, informational
├── assets/icon.svg               # vendor's own PNG favicon, wrapped as SVG
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt`
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly, which resolves `@w6w/types` but not
the `@w6w/runtime` value import `_tools/audit.ts` also uses (`hostAllowed`) — the app's own
`deno.json` has no reason to map a tool-only dependency. This reproduces identically for the sibling
`apify`, `dialpad` and `paddle` apps, so it is a property of how the task invokes the tool, not of
this app; running the auditor from `_tools/` directly (`deno run --no-check -A audit.ts jobnimbus`),
which picks up `_tools/deno.json`'s own import map, is what was actually used to validate this app
(0 errors, 0 warnings).
