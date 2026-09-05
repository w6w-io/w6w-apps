# Ontraport

CRM and marketing automation: contacts, tasks, tags, campaigns (automations), sequences,
transactions, orders and purchases, on the **Ontraport API v1**.

- **Categories** — crm, marketing
- **Auth methods** — api-key (custom: `Api-Key` + `Api-Appid` headers)
- **Actions** — 31
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.ontraport.com` (the `service` check adds `ontraport.statuspage.io`
  to its own hook allowlist, never to the app's)
- **Website** — https://ontraport.com/
- **API docs** — https://api.ontraport.com/doc/
- **Status page** — https://ontraport.statuspage.io/ (`status.ontraport.com` is a decoy — see
  Health checks)

> **Everything below was verified against Ontraport's own sources on 2026-09-05** — the API
> reference at `api.ontraport.com/doc/` (a Slate-generated document, 2,760,600 bytes,
> `<title>Ontraport API</title>`), plus live probes against `api.ontraport.com` and
> `ontraport.statuspage.io`. Nothing here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. Every record is a numbered "object type" — and the numbering isn't obvious

Ontraport models every record — a contact, a task, a tag, an order — as an instance of a
numbered **object type**. A contact is always object type `0`; a task is always `1`; a tag is
`14`; and so on for roughly sixty types. This shows up two ways in the API:

- a **generic** family — `GET/POST/PUT/DELETE /1/object(s)` — that takes an `objectID`
  parameter and works on any object type the permission table allows;
- **dedicated** per-object endpoints (`/Contact(s)`, `/Task(s)`, `/Tags`, `/Order(s)`,
  `/Transaction(s)`, `/Purchase(s)`, `/CampaignBuilderItem(s)`) that need no `objectID` at all.

This app uses the dedicated endpoints wherever one exists. The generic family is used only for
tag-by-name application (`tag-apply`/`tag-remove`, which are inherently cross-object — they
need to be told *which* object type is being tagged) and for **Sequences**, which have no
dedicated endpoint of their own anywhere in the reference doc.

The full object-type table, read structurally from the doc's "Accessible Objects" section
(name → object type ID → which of GET/PUT/POST/DELETE the account is granted), for anyone
extending this app:

| Object | Type ID | GET | PUT | POST | DELETE |
|---|---|:-:|:-:|:-:|:-:|
| Contact | 0 | ✓ | ✓ | ✓ | ✓ |
| Task | 1 | ✓ | ✓ | | |
| User | 2 | ✓ | ✓ | | |
| Group | 3 | ✓ | | | ✓ |
| Sequence | 5 | ✓ | ✓ | ✓ | ✓ |
| Rule | 6 | ✓ | ✓ | ✓ | ✓ |
| Message | 7 | ✓ | ✓ | ✓ | ✓ |
| Note | 12 | ✓ | ✓ | ✓ | ✓ |
| Tag | 14 | ✓ | ✓ | ✓ | ✓ |
| Product | 16 | ✓ | ✓ | ✓ | ✓ |
| Purchase | 17 | ✓ | | | |
| Purchase History Log | 30 | ✓ | | | |
| Credit Card | 45 | ✓ | ✓ | | |
| Transaction | 46 | ✓ | | | |
| Order | 52 | ✓ | | | ✓ |
| Open Order | 44 | ✓ | | | |
| Campaign | 75 | ✓ | | | |
| Campaign Builder | 140 | ✓ | | | |
| Tag Subscriber | 138 | ✓ | | | |
| Webhook | 145 | ✓ | ✓ | ✓ | ✓ |

(This is the subset relevant to a CRM/marketing-automation integration — the full table has
~60 rows, including Calendar Events, Forms, Landing Pages, Inboxes and more, none of which this
app covers. See `lib/client.ts`'s `OBJECT_TYPE` for the constants this app actually sends.)

### 2. Tasks cannot be created or deleted through the API — at all

Ontraport's own permission table grants **Task (object type 1) only GET and PUT** — no POST, no
DELETE — and this isn't a gap in the doc: the "Tasks" section jumps straight from "Retrieve" to
"Update", "Assign", "Cancel", "Complete", "Reschedule", with no "create" or "delete" heading
anywhere. A task therefore comes into existence only as a side effect of `task-assign` (which
assigns a task *message* to contacts, creating the task) or of an Ontraport automation running
in the app itself, and is removed only via `task-cancel`. There is no `task-create` or
`task-delete` action in this app, and a test in `tests/index.test.ts` pins that absence so it
can't be added back without someone re-reading the permission table first.

### 3. An authentication failure is not JSON, despite the doc's own claim

The reference doc states plainly: "All responses will be JSON-encoded regardless of request
method." Measured live on 2026-09-05, that is false for the one response every Connection
eventually produces. A bad `Api-Key`/`Api-Appid` pair answers:

```
HTTP/2 401
content-type: text/html;charset=UTF-8

Your App ID and API Key do not authenticate.
```

— plain text, no `code`, no `data`, no JSON envelope of any kind, and byte-identical whichever
of the two headers is missing, empty, or wrong (confirmed by testing all three combinations
live). There is no vendor error *code* to key off, only this fixed sentence, so both the Auth
`test` hook and the client's generic error formatter classify a failure by matching this text
(`isAuthFailureBody` in `lib/client.ts`) rather than by the bare HTTP status — which is also
this pack's own hard rule for exactly this reason: a 401 can mean several different things on
other APIs, and here it means only one thing, stated only in prose.

## Auth

One method: `api-key`, type `custom` (two headers, not the single-value built-in `apiKey`
type).

| Header | Value |
|---|---|
| `Api-Key` | The account's API key, from Settings > Integrations > API |
| `Api-Appid` | The account's App ID (its "unique site ID"), from the same screen |

Both are required on every request; there is no OAuth surface and no per-tenant host — one
`Api-Appid` identifies the Ontraport account, one `Api-Key` authenticates the caller against it.

### The probe: `GET /1/Contacts/getInfo`

Chosen against this pack's own banned patterns:

- **Requires the credential** — confirmed live: missing, wrong, or half-present headers all
  answer `401` with the plain-text sentence above.
- **Returns no contact data at all** — only a count and the account's field-list settings,
  unlike `GET /1/Contacts` (or any list endpoint), which would hand back real customer PII on
  every health check and every reconnect attempt.
- **Needs no ID, no object type, and no parameter that could itself be wrong** — a probe that
  could fail for a reason *other than* the credential would misreport a working Connection as
  broken.

The same call backs the `quota` health check (see below), so credential liveness and rate-limit
headroom cost exactly one shared request.

## Actions

31 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
|---|---|---|
| `contact-list` | search | `GET /1/Contacts` |
| `contact-get` | read | `GET /1/Contact` |
| `contact-create` | perform | `POST /1/Contacts` |
| `contact-update` | perform | `PUT /1/Contacts` |
| `contact-delete` | perform | `DELETE /1/Contact` |
| `contact-merge` | perform | `POST /1/Contacts/saveorupdate` |
| `task-list` | search | `GET /1/Tasks` |
| `task-get` | read | `GET /1/Task` |
| `task-update` | perform | `PUT /1/Tasks` |
| `task-assign` | perform | `POST /1/task/assign` |
| `task-cancel` | perform | `POST /1/task/cancel` |
| `task-complete` | perform | `POST /1/task/complete` |
| `task-reschedule` | perform | `POST /1/task/reschedule` |
| `tag-list` | search | `GET /1/Tags` |
| `tag-get` | read | `GET /1/Tag` |
| `tag-create` | perform | `POST /1/Tags` |
| `tag-update` | perform | `PUT /1/Tags` |
| `tag-delete` | perform | `DELETE /1/Tag` |
| `tag-apply` | perform | `PUT /1/objects/tagByName` |
| `tag-remove` | perform | `DELETE /1/objects/tagByName` |
| `campaign-list` | search | `GET /1/CampaignBuilderItems` |
| `campaign-get` | read | `GET /1/CampaignBuilderItem` |
| `sequence-list` | search | `GET /1/objects` (objectID=5) |
| `sequence-get` | read | `GET /1/object` (objectID=5) |
| `transaction-list` | search | `GET /1/Transactions` |
| `transaction-get` | read | `GET /1/Transaction` |
| `order-list` | search | `GET /1/Orders` |
| `order-get` | read | `GET /1/Order` |
| `order-delete` | perform | `DELETE /1/Order` |
| `purchase-list` | search | `GET /1/Purchases` |
| `purchase-get` | read | `GET /1/Purchase` |

### Idempotency

`contact-create`, `tag-create` and `task-assign` are `idempotent: false` — each genuinely
creates a new record (or a new task) on every call, and a retry would create a duplicate.
Update/delete/rename/cancel/complete/reschedule actions are `idempotent: true` — re-running any
of them against the same target converges on the same end state (Ontraport's own wording for
`task-cancel`: "an already-finished task does nothing").

### Two parameter-naming inconsistencies in Ontraport's own doc

Worth knowing before debugging a 400: the "object type" concept is spelled **three different
ways** across the task endpoints this app calls, and none of them is wrong — each is
transcribed exactly as documented:

- `objectID` — `objects/tag`, `objects/tagByName`, `objects/sequence`, **and** `task/cancel`
  (where it means the Task type itself, `1`, since `ids` there addresses tasks directly).
- `object_type_id` — `task/assign` and `task/complete` (where it means the type of object the
  tasks are *attached to*, `0` for Contact by default — a different axis from `task/cancel`'s
  `objectID` despite the similar name).

### Notes on individual actions

- **`contact-create` vs `contact-merge`.** `contact-create` allows duplicate emails;
  `contact-merge` (`POST /Contacts/saveorupdate`) updates the contact matching the given email
  or `uniqueId`, creating one only if no match exists. Prefer `contact-merge` whenever a
  workflow re-runs against the same contact.
- **`extraFields`** on the contact actions is a passthrough JSON object merged into the request
  — Ontraport ships ~90 standard contact fields plus unlimited custom fields (`f1234`), and this
  app only surfaces the handful used in nearly every workflow (name, email, company, phone) as
  named params. A custom list-selection field's value must be wrapped in the vendor's own
  `*/*id*/*` delimiter — documented in the field's own hint.
- **`tag-apply`/`tag-remove`** create the tag if it doesn't already exist (`tag-apply`) and
  silently ignore a nonexistent tag name rather than failing (`tag-remove`) — both are the
  vendor's own documented behaviour, not a design choice made here.
- **`task-complete`** takes an optional `data` object that can record a task outcome (e.g.
  `{"outcome": ":=success"}`) and/or update fields on the related object in the same call.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the obvious status host is a decoy

`status.ontraport.com` looks like a claimed Statuspage instance, but every path under it
(`/api/v2/summary.json`, `/api/v2/status.json`, `/history.atom`) answers `302` to
`https://www.statuspage.io` — Statuspage's own generic redirect, not Ontraport's page. Measured
2026-09-05.

The real page is **`ontraport.statuspage.io`**: `GET /api/v2/summary.json` answers `200`,
`application/json`, 6,921 bytes, `page.name: "Ontraport"`, `page.url:
"http://ontraportstatus.com"` (Ontraport's own vanity domain for the same instance).

Its 17 components span far more than this app's REST-API surface — `Landing Pages`,
`Payment Forms`, `Hosted Wordpress Sites`, `DNS`, `Automation`, `Ontraport Login` — most of
which this app never touches. Rolling up the page-level indicator (as several sibling apps do
for a single-surface SaaS) would report the API down because, say, hosted WordPress is having a
bad day. So this check keys its verdict on the one component actually named for it — **`API`**
(id `09fyxy97d1tc`, description "Ontraport API Services") — and reports the rest for context
only, under their own component keys.

Severity is left at the `degraded` default: there is no self-hosted Ontraport, so an API
outage here is evidence about every Connection this app can hold.

### `quota` — a live reading, not a declared absence

Unlike several sibling apps in this pack, rate-limit headroom here is a genuine live signal:
Ontraport's "Rate limiting" section documents `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`
and `X-Rate-Limit-Reset` (seconds until the rolling window resets) on **every** response —
confirmed live (`x-rate-limit-limit: 180`, `x-rate-limit-remaining: 179`,
`x-rate-limit-reset: 23`), and notably present even on an *unauthenticated* 401, so the headers
are attached before credential validation runs. The documented ceiling is **180 requests per
minute per account**, a rolling limit. This check reads the headers off the same signed call
the Auth `test` hook already makes, so headroom reporting costs nothing extra.

The rolling window recovers within a minute on its own, so exhausting it is reported
`degraded`, never `down`.

## Deliberately not covered

Ontraport's API surface is far larger than this app's 31 actions. Left out, and why:

- **Transaction lifecycle actions** — `/transaction/refund`, `/transaction/void`,
  `/transaction/processManual`, `/transaction/markPaid`, `/transaction/convertToCollections`,
  `/transaction/convertToDecline`, `/transaction/rerun`, `/transaction/rerunCommission`,
  `/transaction/resendInvoice`, `/transaction/writeOff`, `/transaction/requestPayment`,
  `/transaction/payInvoice`, and the order-scoped `/transaction/order` GET/PUT. These are
  billing operations with real financial side effects (refunding a real charge, voiding a real
  invoice); this app covers read access to transactions and orders and leaves the mutating
  lifecycle out rather than wiring up a dozen money-moving endpoints without a dedicated review.
- **Custom Objects and Custom Object Relationships** — accessible generically via `objectID`
  10000+, but each account's custom objects have entirely account-specific schemas this app has
  no way to describe generically. `contact-create`/`contact-update`'s `extraFields` param is
  the escape hatch for a custom *field*; a custom *object type* is a bigger surface left for a
  follow-up.
- **Forms, Landing Pages, Calendar Events/Templates, Inboxes/Channels/Conversations, Coupons,
  Offers, Products** (beyond what a Purchase/Order references), **Commissions, Rules, Webhooks,
  Fulfillment** — all real, documented, dedicated endpoint families, out of scope for a first
  pass focused on the core CRM path (contacts, tasks, tags, campaigns/sequences,
  orders/transactions/purchases).
- **`objects/meta`, `objects/getInfo`, `*/fieldeditor`** — schema-introspection endpoints
  (list an object's fields, add/rename/remove a field or section). Useful for building a
  dynamic form against a specific account's custom fields, but this app's params already cover
  the common path and `extraFields` covers the rest without needing a schema call first.
- **`objects/pause`/`objects/unpause`** (pause/resume rules and sequences for an object) —
  real and documented, left out for scope; a natural addition alongside sequence management.
- **Group-based bulk operations** (`group_id`/`performAll` selecting "every member of a saved
  segment" instead of explicit IDs) — the parameters are exposed on every list/bulk action here
  (they are part of the shared `condition`/`search`/`group_id` parameter set Ontraport repeats
  across nearly every endpoint), so the capability exists; there is no separate "list groups"
  action to look up a `group_id` by name.

Nothing was left out because it could not be confirmed: every endpoint mentioned above is
documented in `api.ontraport.com/doc/` and was read there.

## Icon

`assets/icon.svg` wraps `https://i.ontraport.com/3.83c626c8f48bd86cbc432399a7a6d261.PNG`
(125×125, downloaded verbatim on 2026-09-05), the PNG Ontraport's own homepage declares via
`<link rel="icon" type="image/png" href="...">`. Ontraport publishes no SVG mark — neither
`favicon.svg` nor any `logo.svg` exists at any of the paths checked — so this follows the
pack's existing precedent for that exact case (see `apollo`, `blandai`, `chatwork`, `dialpad`,
`gorgias`, `kustomer`): wrapping the vendor's own raster asset in an `<svg><image>` container
rather than hand-tracing a vector that doesn't exist. (`favicon.ico` also exists at
`ontraport.com/favicon.ico`, but at only 16×16 pixels — the homepage's declared 125×125 PNG is
the higher-fidelity source and was used instead.) It is not run through
`_tools/icon-normalize.ts`, matching those apps: that tool re-frames genuine vector artwork
onto the pack's shared canvas, and a wrapped raster already fills its own square.

## Layout

```
ontraport/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # OntraportClient, the envelope, OBJECT_TYPE, error formatting
│   └── params.ts                # shared collection-query Param fragments
├── auth/api-key.ts              # custom two-header credential: sign, test
├── actions/                     # one file per action (31)
├── health/
│   ├── service.ts                # ontraport.statuspage.io, scoped to the API component
│   └── quota.ts                   # rate-limit headroom, signed, off the shared credential probe
├── assets/icon.svg              # vendor's raster mark, wrapped
└── tests/                       # entry module, every action, auth, health, lib
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
