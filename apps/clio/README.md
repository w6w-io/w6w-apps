# Clio

Manage matters, contacts, tasks, calendar entries, time/expense entries and documents in **Clio
Manage**, the legal practice management platform, on the **Clio Manage API v4**.

- **Categories** — legal, crm, productivity
- **Auth methods** — `oauth2` (US), `oauth2-eu`, `oauth2-ca`, `oauth2-au` — one per Clio region
- **Actions** — 25
- **Health checks** — 2 (`service`, `quota`) + 4 derived `auth:oauth2*` checks
- **Egress allowlist** — `app.clio.com`, `eu.app.clio.com`, `ca.app.clio.com`, `au.app.clio.com`
  (the `service` check adds `status.clio.com` to its own hook allowlist, never to the app's)
- **Website** — https://www.clio.com/
- **API docs** — https://docs.developers.clio.com/
- **OpenAPI** — https://docs.developers.clio.com/openapi.json
- **Status page** — https://status.clio.com/

Clio is legal practice management software for law firms: matters (cases), contacts (clients and
counsel), tasks, calendar, time and expense tracking, billing, and document management. This app
covers the core operational surface — the part of the API a workflow actually drives from outside
the practice.

> **Everything below was verified against Clio's own sources on 2026-08-24** — its machine-readable
> OpenAPI 3.1 document
> ([`docs.developers.clio.com/openapi.json`](https://docs.developers.clio.com/openapi.json),
> 3,217,360 bytes, `info.title` "Clio API Documentation", `info.version` `v4`), the Docusaurus
> reference pages it links (Authorization, Fields, Pagination, Rate Limits, Permissions), and live
> probes against all four regional API hosts plus `status.clio.com`. Nothing here came from a
> third-party integration directory.

## The three things most likely to cost someone a day

### 1. Two, textually incompatible shapes of `401`

Measured live on 2026-08-24 against `GET /api/v4/users/who_am_i.json`:

| Request                                              | Status | Body                                                                                                                                     |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| No `Authorization` header (or a malformed one)        | 401    | `{"error": {"type": "UnauthorizedError", "message": "User is not authorized"}}` — the OpenAPI-documented `Error` schema |
| A well-formed but invalid/expired/revoked bearer token | 401    | `{"error": "invalid_token", "error_description": "The access token provided is expired, revoked, malformed or invalid for other reasons."}`, plus a `WWW-Authenticate: Bearer realm="...", error="invalid_token", ...` header |

The second is an RFC 6750 bearer challenge, not the documented `Error` schema — and its `error`
field is a **bare string**, not an object. Code that assumes `body.error.type` throws on the second
case, which is also the far more common one in production (an expired 30-day access token, not a
missing header). [`lib/client.ts`](lib/client.ts)'s `formatClioError` distinguishes both shapes
explicitly; both are pinned by tests in [`tests/lib/client.test.ts`](tests/lib/client.test.ts) and
[`tests/auth/oauth2.test.ts`](tests/auth/oauth2.test.ts).

### 2. A TimeEntry's `quantity` means HOURS on old API versions and SECONDS on the current one

The OpenAPI document's own field description for `Activity.quantity`, verbatim: "Version <= 4.0.3:
The number of hours the TimeEntry took. Latest version: The number of seconds the TimeEntry took."
This app sends no `X-API-VERSION` header, so the account's own configured default decides which unit
answers — a 3,600x error hiding behind a field whose name never changes. `activity-create.ts` and
`activity-update.ts` name the field `quantitySeconds` rather than the ambiguous `quantity`,
specifically so a caller has to notice the unit. If entries come back 3,600x too long or too short,
check the account's default API version (or the response's own `X-API-VERSION` header) before
assuming a data problem.

### 3. A create schema's own top-level `required` array contradicts its field-level descriptions

`POST /notes.json`'s schema lists `required: ["contact", "matter", "type"]` — read literally, both a
contact AND a matter are always mandatory. But `contact.id`'s own description says "Required only if
the Note type is `Contact`", and `matter.id`'s says "Required only if the Note type is `Matter`" —
i.e. exactly ONE of the two, chosen by `type`. Following the blanket `required` array literally would
make it impossible to file a Contact note without inventing an unrelated matter id (or vice versa).
`note-create.ts` follows the field-level rule and sends only the reference that matches the chosen
`type`; both branches are pinned by tests in
[`tests/actions/note-create.test.ts`](tests/actions/note-create.test.ts).

A smaller cousin of the same trap: `Contact`'s create schema has no `primary_email_address` /
`primary_phone_number` fields at all, even though a GET response returns exactly those two flat
strings. Writing an email or phone means sending an `email_addresses[]` / `phone_numbers[]` array
with `default_email` / `default_number` set — see `contact-create.ts`.

## Two structural decisions worth knowing before extending this app

### Four regions, four Auth methods — not a region field

Clio runs four entirely separate regional deployments — `app.clio.com` (US), `eu.app.clio.com`,
`ca.app.clio.com`, `au.app.clio.com` — each with its **own** `/oauth/authorize` and `/oauth/token`
host (confirmed live: all four answer `302` to `GET /oauth/authorize` and `401` to an
unauthenticated `GET /api/v4/users/who_am_i.json`). Which host to redirect the browser to has to be
decided *before* that redirect, so it cannot be a connect-time form field the way an API token's
region often is. This mirrors `apps/docusign`'s production/demo split, generalized to four regions:
`auth/oauth2.ts` exports a `createClioOAuth(region)` factory and default-exports the US instance;
`auth/oauth2-eu.ts`, `oauth2-ca.ts` and `oauth2-au.ts` are three-line siblings. Every Action stays
region-agnostic — it reads the region `afterConnect` recorded on the Connection's `display` via
`apiBase(ctx)` (`lib/client.ts`), the same pattern `apps/customerio` uses for its US/EU split.

### Fields default to almost nothing

Per Clio's own Fields guide: "If the [`fields`] parameter isn't included, the response will return a
minimal set of default fields... For most endpoints, the `id` and `etag` fields are the only default
fields returned." This is the opposite footgun from a vendor whose list defaults are enormous, but
just as costly — a first call that reads the documented response shape and calls the endpoint
without `fields` gets back almost nothing. Every list/get Action here prefills a sensible `fields`
value (visible as the param's default in the editor) rather than leaving Clio's own near-empty
default in place; a derived test in [`tests/index.test.ts`](tests/index.test.ts) asserts every
`fields` param carries a non-trivial default.

## No OAuth `scope` parameter

Clio's Permissions guide states that "access permissions" — read / read-write, per resource type
(Matters, Contacts, Tasks, ...) — are chosen when the OAuth application itself is **registered** in
the Clio developer portal, not requested per authorization request. The `/oauth/authorize` example in
Clio's own docs carries no `scope` parameter at all. So `oauth2.scopes` is deliberately left empty on
every regional Auth method — an app registered with only read access to Matters will `403` on
`matter-create` regardless of anything this app declares, and the fix is changing the app's own
registration in the Clio developer portal, not this Connection. PKCE is also not offered by Clio's
authorize endpoint, so `pkce: false`.

## Auth

Authorization Code grant, one Auth method per region (see above). The probe (`test`) and display
label (`afterConnect`) both use `GET /users/who_am_i.json` — chosen because it needs no particular
access permission beyond the baseline every OAuth application has (it is about the *authenticated
user*, not a resource type an app's registration can be scoped away from), and its response — id,
name, email, roles, time zone — carries no credential material (verified against the `User` /
`User_base` OpenAPI schemas).

`refresh` and `exchange` are intentionally **not** implemented — every one of this pack's other 88
`oauth2`-type apps leaves the standard authorization-code exchange and refresh-token renewal to the
host's generic OAuth2 handling, driven by the declared `tokenUrl`. Clio's token endpoint is fully
standard RFC 6749 (`application/x-www-form-urlencoded`, JSON response), so this app follows the same
precedent. Clio's own docs describe a `POST /oauth/deauthorize` (authenticated with the token being
revoked, not a standalone RFC 7009 call) — `revokeUrl` is declared on every regional method for hosts
that call it generically, with that authentication quirk noted here for whoever wires it up.

## Actions

25 actions. `resource` groups them in the editor.

| Key                        | Type    | Endpoint                                          |
| --------------------------- | ------- | -------------------------------------------------- |
| `matter-list`               | search  | `GET /matters.json`                                |
| `matter-get`                | read    | `GET /matters/{id}.json`                           |
| `matter-create`             | perform | `POST /matters.json`                               |
| `matter-update`             | perform | `PATCH /matters/{id}.json`                         |
| `contact-list`               | search  | `GET /contacts.json`                               |
| `contact-get`                | read    | `GET /contacts/{id}.json`                          |
| `contact-create`             | perform | `POST /contacts.json`                              |
| `contact-update`             | perform | `PATCH /contacts/{id}.json`                        |
| `task-list`                  | search  | `GET /tasks.json`                                  |
| `task-get`                   | read    | `GET /tasks/{id}.json`                             |
| `task-create`                | perform | `POST /tasks.json`                                 |
| `task-update`                | perform | `PATCH /tasks/{id}.json`                           |
| `calendar-entry-list`        | search  | `GET /calendar_entries.json`                       |
| `calendar-entry-get`         | read    | `GET /calendar_entries/{id}.json`                  |
| `calendar-entry-create`      | perform | `POST /calendar_entries.json`                      |
| `activity-list`              | search  | `GET /activities.json`                             |
| `activity-get`               | read    | `GET /activities/{id}.json`                        |
| `activity-create`            | perform | `POST /activities.json`                            |
| `activity-update`            | perform | `PATCH /activities/{id}.json`                      |
| `document-list`              | search  | `GET /documents.json`                              |
| `document-get`               | read    | `GET /documents/{id}.json`                         |
| `document-download-get`      | read    | `GET /documents/{id}/download.json` (303 → URL)    |
| `note-list`                  | search  | `GET /notes.json`                                  |
| `note-create`                | perform | `POST /notes.json`                                 |
| `user-who-am-i`              | read    | `GET /users/who_am_i.json`                         |

### Idempotency

Every `*-create` action is `idempotent: false` — a retry starts a second, distinct record (Clio's
create endpoints take no idempotency key of any kind). Every `*-update` action is `idempotent: true`
— a `PATCH` by id is safe to retry, since re-applying the same partial body twice yields the same end
state.

### Pagination

Cursor pagination (`order=id(asc)`, Clio's own default and the only approach with no total-record
ceiling) is applied by every list action automatically. `meta.paging.next` / `.previous` in a raw
Clio response are full URLs; this app extracts just the `page_token` query value
(`nextPageToken` / `previousPageToken` in each action's output) so a caller passes a short token back
into the next call rather than a vendor URL. **`calendar_entries.json` has no `order` parameter at
all** (verified against its own OpenAPI parameter list) — unlike matters, contacts, tasks, activities,
documents and notes — so `calendar-entry-list` never sends one, to avoid risking a `400` for an
undocumented parameter.

Offset pagination (an `offset` query param, capped at 10,000 total records) is documented but not
exposed by this app — cursor pagination has no ceiling and is the vendor's own default.

### Notes on individual actions

- **`document-download-get` returns a URL, not bytes.** `GET /documents/{id}/download.json`
  redirects (`303`) to a pre-signed URL on a Clio-operated S3 bucket whose exact host varies by
  account region (`clio-manage-prod-*-a-documents.s3.<region>.amazonaws.com`, `documents.goclio.com`,
  `documents.goclio.eu`, ... — enumerated from the Content-Security-Policy header a live
  `app.clio.com` page carries) and cannot be a fixed `network.allow` entry. This action calls
  `ctx.fetch` with `redirect: "manual"` and returns the `Location` header directly; the URL is
  short-lived and meant to be handed to whatever step needs the actual bytes, not stored.
- **`task-create`'s `assignee.type` is capitalized** (`"User"` / `"Contact"`), unlike the lowercase
  `assignee_type` the LIST endpoint's own filter takes — two different casings for the same concept
  in the same resource.
- **`task-list`'s `assignee_id` filter requires `assignee_type` alongside it** — Clio's own parameter
  description: "must be passed if filtering by assignee."
- **`calendar-entry-create`'s `calendar_owner` names the *Calendar* the entry is filed under, not a
  user** — easy to misread from the name alone.
- **`activity-create`/`activity-update`'s `price` behavior on a TimeEntry**: leaving it empty while
  changing the matter, user or activity description resets it from the applicable rate hierarchy —
  Clio's own documented behavior, not a bug if a price you expected to stick doesn't.
- **`matter-create`'s `display_number`** is optional; leaving it empty lets Clio assign one
  automatically unless the account has manual matter numbering enabled.

## Health checks

Two declared checks plus four derived `auth:oauth2*` checks (one per regional Auth method).

### `service` — page-level indicator only, and here's why

Clio publishes at `status.clio.com`, DNS-CNAMEd to `statuspage.incident.io` — an incident.io-hosted
status page exposing a Statuspage-v2-*compatible* JSON API at `/api/v2/*`. Checked three ways on
2026-08-24:

- **Bogus sibling path.** `/api/v2/summary.json` (998 bytes) and `/api/v2/status.json` (211 bytes)
  both answer `200` with distinct JSON; `/api/v2/definitely-not-real-zzz.json` answers a bare `404`.
- **Does the page describe Clio?** Yes — `page.name` is "Clio Status Pages", `page.url` is
  `https://status.clio.com/`, and the page's own HTML lists genuine Clio product components: Clio
  Manage, Clio Grow, Clio Payments, Clio Draft, Clio Work, Clio Accounting, Clio File - eFiling, Clio
  Manage AI, Clio Calendar Rules.
- **Is any of that in the machine-readable feed?** No — `/api/v2/summary.json` and
  `/api/v2/components.json` both answer `components: []`. incident.io's public v2 API does not expose
  the per-component breakdown the page's own frontend renders from a separate, undocumented endpoint.
  So this check reports Clio's **page-level `status.indicator`** only, the same "indicator, not
  components" shape a few other apps in this pack use when a vendor's page-level summary is the only
  thing actually published.

`credential: "none"` — a status host must never see a Clio access token.

### `quota` — rate-limit headroom, read from a signed whoami

Per Clio's Rate Limits guide, every response carries `X-RateLimit-Limit` / `-Remaining` / `-Reset` (a
Unix timestamp). Default: 50 requests/minute during each region's own peak hours, higher off-peak —
"may change without notice," so the headers, never a hard-coded number, are the only thing trusted.
This check reads them off a signed `GET /users/who_am_i.json` (the same endpoint `test`/`afterConnect`
use). **Measured live: an unauthenticated 401 carries NONE of the three headers** — rate limiting is
scoped to a live token, so a request that never authenticates has no per-token bucket to report
against. A `401` therefore reports `unknown` ("cannot read quota"), never `degraded`
("quota exhausted") and never a healthy full window.

## Deliberately not covered

Clio's API has **166 documented top-level paths**. This app covers the matters/contacts/tasks/
calendar/activities/documents/notes core a workflow drives from outside the practice. What is left
out, and why:

- **Billing** (`bills.json`, `bill_themes.json`, `credit_memos.json`, `trust_line_items.json`,
  `trust_requests.json`, `bank_accounts.json`, `bank_transactions.json`, `bank_transfers.json`,
  `allocations.json`, `interest_charges.json`) — a large, accounting-shaped surface with its own
  correctness requirements (trust accounting compliance in particular) that deserves its own careful
  pass rather than a partial one bolted onto this app.
- **Document creation/upload** (`POST /documents.json`) — Clio's own summary states it can also
  "Create Document Version to an existing Document," and the underlying flow is a multi-step,
  pre-signed upload (`multiparts`) this app did not verify end-to-end. `document-list` /
  `document-get` / `document-download-get` (read-side) are covered; write-side upload is not.
  `document_templates.json` / `document_automations.json` (Clio's document-generation feature) are
  likewise out of scope.
- **Court rules** (`court_rules/**`) — jurisdiction-specific deadline calculation, a specialized
  surface with its own data model (jurisdictions, triggers, matter dockets).
- **Reports** (`reports.json`, `report_presets.json`, `report_schedules.json`) — report generation
  and scheduling, a separate concern from the record CRUD this app focuses on.
- **Communications and conversations** (`communications.json`, `conversations.json`,
  `conversation_messages.json`) — Clio's logged-communication and messaging features.
- **Custom fields administration** (`custom_fields.json`, `custom_field_sets.json`) — reading/writing
  the custom field *definitions* themselves, as opposed to setting a custom field *value* on a
  record (which the covered create/update actions already support via `custom_field_values`, not
  separately exposed as a param here for the initial cut).
- **Webhooks** (`webhooks.json`) — subscription management. Would pair naturally with a future
  `TriggerDefinition`; out of scope for this Action-only pass.
- **Safe custody, medical records/bills, grants, damages, LAUK rates** — narrow, jurisdiction- or
  practice-area-specific resources (UK legal aid rates, personal-injury medical record tracking,
  grant funding) outside this app's core scope.
- **Groups, practice areas, matter stages, task types/templates as admin resources** — read-only
  reference data an integration typically resolves once and caches, rather than something a workflow
  repeatedly calls; the id-based `refParam` fields on the covered actions assume the caller already
  has these ids (e.g. from Clio's own UI).
- **`GET /users.json` (the list)** — `user-who-am-i` (the connected user) is covered; listing every
  user in the account was left out for the initial cut, since resolving a specific assignee/attorney
  by name is typically a one-time lookup done in Clio's own UI, not a repeated workflow need.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.png` is Clio's own mark, downloaded **verbatim** from
`https://docs.developers.clio.com/img/favicon.png` on 2026-08-24 — 1,895 bytes, 64×64 PNG, md5
`92de47b9702a9c7cfc3b9e2289cf1119`, a blue circle with a white checkmark. No SVG mark was found:
`www.clio.com/favicon.svg` 404s, and both `www.clio.com/favicon.ico` and
`www.clio.com/apple-touch-icon.png` answer `200` with **zero bytes** (the marketing site's bot
protection, per this pack's own prior notes on `www.clio.com`). The docs-portal favicon was confirmed
as Clio's real mark, not a Docusaurus default, against the *same* mark embedded in Clio's incident.io
status page (`status.clio.com`, a 32×32 PNG uploaded by Clio to
`storage.googleapis.com/incident-io-status-page-logos/.../clio-status-pages/qjc9dqhk.png`) — visually
identical, just smaller. PNG icon per this pack's existing precedent when no true vector mark exists
(e.g. `apps/browseai`, `apps/amplitude`, `apps/kit`). A test asserts the exact byte length, PNG
signature and 64×64 dimensions, so a re-encode or redraw fails the suite.

## Layout

```
clio/
├── package.json                  # manifest — the `w6w` identity block
├── index.ts                      # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # ClioClient, region resolution, the two 401 shapes, pagination
│   └── params.ts                 # shared Param fragments and the vendor's enums
├── auth/
│   ├── oauth2.ts                 # createClioOAuth factory + US default export
│   ├── oauth2-eu.ts               # EU regional sibling
│   ├── oauth2-ca.ts               # CA regional sibling
│   └── oauth2-au.ts               # AU regional sibling
├── actions/                      # one file per action (25)
├── health/
│   ├── service.ts                # status.clio.com, page-level indicator only
│   └── quota.ts                  # X-RateLimit-* headroom, signed
├── assets/icon.png                # vendor mark, verbatim
└── tests/                        # 124 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
