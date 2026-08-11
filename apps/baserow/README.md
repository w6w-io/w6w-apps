# Baserow

Rows, batches and schema discovery on the **Baserow REST API**, against Baserow Cloud **and**
self-hosted instances alike.

- **Categories** — databases, spreadsheets, productivity
- **Auth methods** — database-token
- **Actions** — 12
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:database-token`
- **Egress allowlist** — `*` (see below — the instance is per-connection)
- **Website** — https://baserow.io/
- **Source repository** — https://github.com/baserow/baserow (MIT core)
- **API docs** — https://api.baserow.io/api/redoc/

Baserow is an open-source no-code database — the Airtable shape. This app's centre of gravity is
therefore **rows**: reading them with the same filters a view uses, writing them one at a time or two
hundred at a time, and finding out what a table is made of.

> **Everything below was verified against Baserow's own OpenAPI document on 2026-08-10** —
> [`api.baserow.io/api/schema.json`](https://api.baserow.io/api/schema.json), OpenAPI 3.0.3,
> "Baserow API spec" **v2.3.3**, 6.0 MB, 293 paths — plus live probes against `api.baserow.io`.
> Nothing here came from a third-party integration directory.

## The four things most likely to go wrong

### 1. There is no vendor host — the instance *is* the host

Baserow's OpenAPI document declares **no `servers` block at all**. It runs as Baserow Cloud at
`api.baserow.io` and as a Docker container on anyone's own domain, so:

- the manifest declares `network.allow: ["*"]`, exactly as the sibling `metabase`, `grist` and
  `discourse` apps do, because the reachable host is the customer's own domain;
- the instance URL is an **Auth field**, not an Action param. A token minted on one instance is
  valid on that instance only, so the URL and the token are two halves of one Connection.
  `tests/index.test.ts` asserts no action can take a URL, host or origin param.

### 2. The header is `Authorization: Token …`, not `Bearer`

From the vendor's own security scheme:

```json
"Database token": { "type": "http", "scheme": "bearer", "bearerFormat": "Token your_token" }
```

Verified on the wire, and the failure modes are distinguishable:

| Sent | Status | Body |
| --- | --- | --- |
| Valid token | 200 | the table list |
| Unknown token | 403 | `{"error":"ERROR_TOKEN_DOES_NOT_EXIST", …}` |
| No header | 403 | `{"detail":"Authentication credentials were not provided."}` |
| `Bearer …` / `JWT …` prefix | 403 | *the no-credentials answer* — a prefix mix-up looks like a missing header |

### 3. `user_field_names` is what makes the API legible — and it defaults ON here

Without it Baserow keys row data by internal field id:

```json
{ "id": 1, "field_4321": "Ada", "field_4322": 36 }
```

With it, by the field's actual name:

```json
{ "id": 1, "Name": "Ada", "Age": 36 }
```

Every row action in this app sends `user_field_names=true` unless you explicitly turn it off,
because a workflow that maps fields by number breaks silently the first time a field is deleted and
recreated. Turn it off when the opposite matters: **field ids survive a rename; names survive a
re-creation.**

### 4. Batches are capped at 200, and batch update needs an `id` per row

Baserow's spec types every batch body's `items` with `maxItems: 200`. This app checks that before
sending, so a workflow that built 5,000 rows is told immediately rather than having the whole
payload rejected.

Batch *update* additionally requires every item to carry its own `id` — there is no
create-if-missing. An item without one is a validation error, and this app names the offending index
rather than forwarding an opaque 400.

Note also the two surprising methods: **Move Row is a `PATCH`** (not POST) and **Delete Rows (Batch)
is a `POST`** to `/batch-delete/` (not DELETE), because a DELETE with a body is not portable.

## Auth

One method: **database token**, from **Settings → Database tokens** in Baserow. A token is scoped to
**one database** and carries four independent per-table flags — create, read, update, delete — and
can be revoked on its own.

### Why not the JWT scheme

Baserow's other credential is a JWT from `POST /api/user/token-auth/` with an email and password. It
reaches more of the API, and it is deliberately not shipped:

1. **`sign` cannot make a network call.** The hook that attaches a credential is network-less by
   design. A JWT has to be fetched before it can be attached, and it expires — so a JWT flow must
   re-authenticate underneath a Connection that still looks healthy.
2. **It means storing a human's password**, where a database token is a scoped, revocable credential.

The cost, stated plainly rather than hidden: **this app cannot create tables or fields**, and cannot
configure views. Every action it *does* ship is one Baserow's own spec marks as accepting a database
token. If schema writes are ever needed, they belong in a second `AuthDefinition` with an `exchange`
hook, not in this one.

### The probe is `GET /api/database/tables/all-tables/`

Chosen for three reasons, all read off the vendor's spec and confirmed live:

1. **It is the only endpoint in the API whose sole accepted scheme is the database token** — the spec
   marks it `security: [{"Database token"}]` with no JWT alternative. It exists to answer "what can
   this token see?", so probing it tests exactly the credential this app uses.
2. **It needs none of the token's four permissions.** Every other database-token endpoint is scoped
   to a table and a permission flag, so probing one would report a correctly-scoped write-only token
   as broken.
3. **It returns no credential material.** The response is `{id, name, database_id}` per table —
   metadata about the customer's data, not about the key. This is the concern that sinks
   `/me`-shaped probes elsewhere (Follow Up Boss's `/me` returns the caller's own API key; Mailjet's
   `/apikey` returns key and secret).

`test` also rejects two cases a bare status check would pass: a `200` that is not a table list (a
reverse proxy's login page — Baserow is commonly behind one), and a valid token that can reach **no**
tables, which is live but useless.

`afterConnect` publishes the normalised origin, the host, and the token's *reach* — a table count and
the database ids it spans. Deliberately **not** the table list itself: a Connection's display block
is shown wherever the connection is, and a full table inventory is more of the customer's schema than
a label needs.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `table-list` | search | `GET /api/database/tables/all-tables/` |
| `field-list` | search | `GET /api/database/fields/table/{id}/` |
| `row-list` | search | `GET /api/database/rows/table/{id}/` |
| `row-get` | read | `GET /api/database/rows/table/{id}/{row}/` |
| `row-create` | perform | `POST /api/database/rows/table/{id}/` |
| `row-update` | perform | `PATCH /api/database/rows/table/{id}/{row}/` |
| `row-delete` | perform | `DELETE /api/database/rows/table/{id}/{row}/` |
| `row-move` | perform | `PATCH /api/database/rows/table/{id}/{row}/move/` |
| `row-names` | read | `GET /api/database/rows/names/` |
| `rows-create-batch` | perform | `POST /api/database/rows/table/{id}/batch/` |
| `rows-update-batch` | perform | `PATCH /api/database/rows/table/{id}/batch/` |
| `rows-delete-batch` | perform | `POST /api/database/rows/table/{id}/batch-delete/` |

### Notes on individual actions

**`row-list` has three ways to filter and they are not equivalent.** `viewId` applies a saved view's
own filters *and* sorts — one parameter instead of ten, when the view already exists.
`fieldFilters` is Baserow's dynamically-named `filter__{field}__{filter}` query parameters, taken
here as a JSON object (`{"filter__Name__contains": "ada"}`) because no form can enumerate them; keys
must start with `filter__`, and anything else is refused — without that guard the parameter would be
an arbitrary query-string injection point that could smuggle in `user_field_names` or `size` and
silently change the response shape. `filters` is a JSON filter *tree* for the nested AND/OR groups
the flat parameters cannot express.

**`row-update` passes its body through verbatim, not compacted.** An explicit `null` is how a
Baserow field is *cleared*; dropping nulls would make that impossible. An omitted field keeps its
value.

**`row-move` with no `beforeId` moves the row to the end of the table.** That is the vendor's
documented behaviour, not a missing argument.

**`row-names` is the cheap way to resolve link-row ids.** A row that links to another table gives you
ids; this turns a page of them into primary-field values in one request instead of one Get Row per
id.

**`sendWebhookEvents` is exposed on every write.** Baserow fires the table's webhooks after a write
unless it is off, and a bulk load that fans out to every webhook is a real way to melt a downstream
system.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | informational | Reads `status.baserow.org/index.json` |
| `quota` | quota | app | informational | Declared `unavailable` — no readable headroom |
| `auth:database-token` | — | connection | — | Derived from `Auth.test` automatically |

### Finding the real status page took three tries, and two were traps

| Candidate | What it actually is |
| --- | --- |
| `status.baserow.io` | **Does not resolve.** The `.io` guess is wrong. |
| `baserow.instatus.com` | A **superseded** Instatus page that still answers with component JSON. Its own `page.url` points at `status.baserow.org` — it knows it has been replaced. |
| `status.baserow.org` | The real, claimed **Better Stack** page — but it serves the identical **483,220-byte** HTML (md5 `92aac70439f4`) for `/summary.json`, `/history.atom`, `/api/v2/summary.json` *and* `/definitely-not-real-zzz.json`. Every Statuspage-shaped path there is a catch-all. |

The endpoint this check uses is **`status.baserow.org/index.json`**, Better Stack's own JSON document
for that page — 49,528 bytes of JSON versus 483,220 bytes of HTML for a nonsense path.

Note that the usual discriminator does not apply here: **this page answers `200` to a nonsense path,
not `404`**, so "the bogus sibling is refused" cannot be the test. What separates them is that
`/index.json` returns a different, smaller, JSON payload that names the product. The check enforces
exactly that — it requires the parsed body to be Better Stack's `data.attributes` shape *and* to
self-identify as Baserow, so the day that route disappears it reports `unknown` rather than parsing a
web page forever.

It self-identifies unambiguously — `company_name: "Baserow"`, `company_url: "https://baserow.io/"`,
`custom_domain: "status.baserow.org"` — and its resources name the hosts they watch: Frontend
(baserow.io), Backend API (api.baserow.io), Community forum, Background worker, Task queue size.

**Why `informational`:** the page covers Baserow's *hosted* service. Baserow is open source and
shipped as a Docker image, and a large share of installs are somebody's own container. This check is
`scope: "app"`, so it cannot tell hosted Connections from self-hosted ones — at the `degraded`
default an incident on baserow.io would pin every self-hosted tenant's App at `degraded`, which is a
plain untruth about their instance. Same call `apps/metabase` and `apps/discourse` make. Nothing is
lost: the derived `auth:database-token` check probes *their* instance, per Connection.

### Why `quota` is unavailable

A live response from `api.baserow.io` carries no `RateLimit-*`, `X-RateLimit-*` or `Retry-After`
header. Baserow's OpenAPI document contains **zero** occurrences of `RateLimit`, `Retry-After` or
`throttl`, and declares a `429` on exactly **two** endpoints — two-factor verification and workspace
invitations, both anti-abuse limits on security-sensitive actions, and neither in this app's surface.
No row endpoint declares a 429 at all.

What Baserow does limit is the *size of a request* (200 items per batch) and, on the hosted plans,
rows and storage per workspace. Neither is an allowance that depletes with requests, and a
self-hosted instance is bounded by its own reverse proxy, which this app cannot see.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Table and field *writes*** (create/update/delete a table or field) | JWT-only. Schema migration is also a different job from data integration — doing it from a workflow is usually a mistake. The read side of both *is* shipped, because every row action needs it. |
| **View configuration** (filters, sorts, decorations, grid/gallery/calendar/kanban settings) | JWT-only, and a large surface — `/api/database/views/…` is over 60 paths. `row-list` can *use* a view via `viewId`, which is the part a workflow needs. |
| **File upload** (`/api/user-files/upload-file/`) | Multipart, and file fields need a two-step upload-then-reference dance. Worth its own pass. |
| **Row comments and row history** | JWT-only. |
| **Workspaces, applications, snapshots, trash, admin** | Account administration rather than workflow steps, and all JWT-only. |
| **Baserow's export and import jobs** | Async job endpoints — create, poll, fetch — which need a polling design, not a single action. |

## Icon

`assets/icon.svg` is **Baserow's own glyph mark** (`baserow_logo_glyph`), not a drawing. It was taken
verbatim from n8n's `nodes-base`, which is where the pack's other vendor marks of this kind come
from:

```
https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Baserow/baserow.svg
```

The paths and Baserow's three brand colours (`#4d68c4`, `#5190ef`, `#2bc3f1`) are unmodified. Run
`deno task fmt`, never bare `deno fmt` — the latter reformats `assets/` and would rewrite the vendor
paths.

## Layout

```
baserow/
├── index.ts                  # AppDefinition: 12 actions, 1 auth, 2 health checks
├── lib/client.ts             # site URL from the connection, flags, batch limits, error taxonomy
├── lib/params.ts             # shared Param fragments
├── auth/database-token.ts    # Token header, all-tables probe, reach published on connect
├── actions/                  # one file per action
├── health/                   # service (status.baserow.org) + quota (unavailable)
└── tests/                    # 94 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 94 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
