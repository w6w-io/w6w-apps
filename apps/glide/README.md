# Glide

Read and write rows in Glide **Big Tables**, manage a table's schema, stage large datasets with
stashing, and finish the file-upload handshake — over the classic Glide API.

- **Categories** — databases, developer-tools, productivity
- **Auth methods** — api-token (bearer)
- **Actions** — 14
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-token`
- **Egress allowlist** — `api.glideapps.com`
- **Website** — https://www.glideapps.com
- **API docs** — https://www.glideapps.com/docs/reference (OpenAPI:
  https://www.glideapps.com/docs/openapi.json)

> **Everything below was verified against Glide's own OpenAPI 3.1 document on 2026-09-06** —
> `www.glideapps.com/docs/openapi.json`, 69,411 bytes, 14 operations — plus the prose docs it links
> to (`docs/classic-api/general/*`, `docs/classic-api/stashing/*`,
> `docs/classic-api/tables/data-versioning`) and live probes against `api.glideapps.com` and
> `status.glideapps.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. This API only ever sees Big Tables

`GET /tables`'s own description is explicit: **"Get a list of all Big Tables associated with the
team of the authenticated user. No other table types will be included in the response, even
though they are part of your Glide team."**

Big Tables are Glide's own large-capacity cloud data source — a distinct table type from the
spreadsheet-backed sources (Google Sheets, Airtable, and the builder's own "Glide Tables" grid
feature) most Glide apps are actually built on. There is no endpoint anywhere in this API for
those. A workflow author expecting to read an ordinary Glide app's data will see an empty
`table-list` result until they specifically add a Big Table to their team.

### 2. An invalid auth token answers `404`, not `401`

Glide's own errors page states this in plain language: **"Using an auth token that does not exist
or is incorrect will result in a `404` response status,"** with body
`{"error":{"type":"request_error","message":"API key not found, or duplicate IN****ID"}}`. Every
credential check in this app — the `test` hook and the `service`/`quota` design — classifies by
that response **body**, never by status code; a probe that branched on 401 would simply never
fire. See `auth/api-token.ts`.

### 3. The file-upload flow has a step this app cannot perform

`POST /apps/{appID}/uploads` hands back `uploadLocation`, a pre-signed URL on Glide's storage
provider (observed pointing at `storage.googleapis.com`, but the vendor's own docs do not commit
to a host) — not `api.glideapps.com`. That is exactly the kind of per-call, dynamically-issued
address `network.allow` cannot enumerate ahead of time. `upload-create` and `upload-complete` only
ever talk to the Glide API that brackets the actual byte transfer; PUTting the file itself to
`uploadLocation` is left to a plain HTTP request step elsewhere in the workflow, with
`content-type` set to the same value passed to `upload-create`.

## Auth

One method: **API Auth Token** (`type: bearer`), from the Glide Data Editor. Sent as
`Authorization: Bearer <token>`.

The token is **team-wide, not app- or table-scoped** — Glide's own docs: "it is scoped to your
Glide team, so it has access to all applications and data in your team." There is no finer-grained
permission to request; every Connection using this method reaches every Big Table the team owns.

### The probe is `GET /tables`

Chosen because it needs no table id and no permission finer than the token's own team scope (Glide
has none to be refused by), and its response — `{"data": [{"id", "name"}, ...]}` — carries table
identity only, never anything that could be mistaken for credential material.
`afterConnect` republishes just a **count** of the tables the token reaches (`tableCount`), not the
list itself, for the connection label — a full inventory is more of the team's data than a label
needs.

## Actions

| Action | Type | Endpoint |
|---|---|---|
| `table-list` | search | `GET /tables` |
| `table-create` | perform | `POST /tables` |
| `table-overwrite` | perform | `PUT /tables/{tableID}` |
| `rows-list` | search | `GET /tables/{tableID}/rows` |
| `rows-version-get` | read | `HEAD /tables/{tableID}/rows` |
| `row-get` | read | `GET /tables/{tableID}/rows/{rowID}` |
| `rows-add` | perform | `POST /tables/{tableID}/rows` |
| `row-update` | perform | `PATCH /tables/{tableID}/rows/{rowID}` |
| `row-delete` | perform | `DELETE /tables/{tableID}/rows/{rowID}` |
| `job-status-get` | read | `GET /jobs/{jobID}` |
| `stash-data` | perform | `PUT /stashes/{stashID}/{serial}` |
| `stash-delete` | perform | `DELETE /stashes/{stashID}` |
| `upload-create` | perform | `POST /apps/{appID}/uploads` |
| `upload-complete` | perform | `POST /apps/{appID}/uploads/{uploadID}/complete` |

This is the API's **entire** documented surface — 14 operations, all 14 shipped. Nothing here was
padded, and nothing was left out because it seemed uninteresting; anything not in this table is
covered under [Deliberately out of scope](#deliberately-out-of-scope) with a stated reason.

### Notes on individual actions

**Rows are opaque JSON, keyed by column id.** A Big Table's row shape is the customer's own
schema, so `row-get`/`row-update`/`rows-add`/etc. declare no fixed `output`/param shape for the row
data itself beyond a `type: "json"` field — the same call Baserow's and Algolia's row/object
actions make, for the same reason.

**`row-update` sends field values verbatim, not compacted.** An explicit `null` is how a Glide
column is cleared; an omitted key leaves that column untouched. Dropping `null`s would make
clearing a column impossible.

**`onSchemaError` controls what happens when row data doesn't match a table's schema** (`abort`
— Glide's own default, fails the call outright; `dropColumns` — skip the offending columns for
affected rows; `updateSchema` — widen/add columns as needed). Every write that can conflict with a
schema exposes it.

**`table-create`/`table-overwrite`/`rows-add` all accept a stash reference in place of inline
rows** — `{"$stashID": "20240215-job32"}` — for a dataset too large to send in one request. Glide's
own guidance: inline is fine for "a few hundred rows or less depending on schema complexity";
anything larger should go through `stash-data` first.

**Data versioning: `rows-version-get` and `If-Match`.** `HEAD /tables/{tableID}/rows` returns the
table's current version as an `ETag` header, with no body — poll it to detect changes without
downloading data. Pass that same value as `ifMatch` on `row-update` (guards the one row) or
`table-overwrite` (guards the whole table) to get a `412 Precondition Failed` instead of silently
clobbering a concurrent edit. The value must be the **exact quoted string**, e.g. `"42"` including
the quotes — validated client-side (`assertIfMatch`) since a bare `42` is the likeliest paste
mistake and Glide's own rejection would otherwise be an opaque 400.

**Stash IDs and serials are caller-defined, not minted by Glide**, and share one grammar (letters,
numbers, hyphens, underscores; must start with a letter or number; 256 characters max) — validated
client-side (`assertStashToken`) for the same reason as `ifMatch` above. The **id** groups a
dataset's chunks; the **serial** orders them (numeric sort if every serial in the stash parses as
an integer, lexicographic otherwise). Glide auto-deletes a stash 48 hours after creation even if
`stash-delete` is never called.

**`table-overwrite`'s own documented warning:** "There is currently no way to supply values for
user-specific columns in the API. Those columns will be cleared when using this endpoint."

**`job-status-get` reports once, not a wait.** `x-glide-asynchronous` on `table-create`/
`table-overwrite` *allows* Glide to answer with a `jobID` instead of finishing inline — it does not
*force* asynchronous processing, so both actions return a `jobID` either way and a workflow decides
whether to poll it.

## Deliberately out of scope

| Surface | Why |
|---|---|
| **Anything outside Big Tables** — app configuration, layouts, screens, users, billing, non-Big-Table data sources | Not exposed by this API at all (see finding #1 above). |
| **PUTting the upload's bytes to `uploadLocation`** | The address is a per-call pre-signed URL this app's manifest cannot allowlist in advance (see finding #3 above). Left to a plain HTTP request step. |
| **`name` as a query parameter on `POST /tables`** | The spec documents an alternate calling convention (a bare row array in the body, with the table name and CSV/TSV content passed via `?name=`) for CSV/TSV uploads. This app exposes exactly one, cleaner convention — a structured `{name, schema, rows}` JSON body — that reaches the identical result. |

## Health checks

Three questions get confused with each other, so this section keeps them apart: is the *vendor*
up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**`status.glideapps.com`'s Atom history feed** — verified live 2026-09-06:

```
GET https://status.glideapps.com/api/v2/summary.json  -> 404 "Page not found" (plain text)
GET https://status.glideapps.com/index.json            -> 404 "Page not found"
GET https://status.glideapps.com/history.atom          -> 200, real Atom feed
```

Neither an Atlassian Statuspage nor an Instatus/Better-Stack page — those platforms' shared
`/api/v2/*`/`/index.json` conventions both 404 outright, ruling out a catch-all decoy. What Glide
actually publishes is a plain Atom feed, self-identified unambiguously:

```xml
<title>Glide Apps Status - Incident History</title>
<author><name>Glide</name></author>
```

A real incident observed the same day named exactly the surface this app covers — "Glide Classic
increased error rate," components `Apps, General, Data, Glide Tables, Builder, General` ("Glide
Classic" is the vendor's own name for the API this app calls: `docs/classic-api/*`).

**No component-level JSON exists** — every incident rolls into one page-level verdict
(`covers: ["*"]`); this check cannot separate "Big Tables is down" from "the builder is down."

**Reading "still open" without a structured `resolved` field.** The feed's generic parsing gives
plain text per incident, newest update first. This check reads the *first* recognised status word
in that text — `resolved` (closes it) or `issue` (Glide's own word for a freshly opened incident,
the only two words actually observed live; the common `monitoring`/`identified`/`investigating`
vocabulary is included defensively but unverified against a real Glide incident). Severity for an
open incident follows the feed's own `Major incident` / `Minor incident` prefix. Text naming none
of these reports `unknown` rather than a guess.

### Is this credential live?

`GET /tables` — see [Auth](#auth) above.

### Do we have quota left?

**Declared unavailable.** A live `api.glideapps.com` response carries no `RateLimit-*`,
`X-RateLimit-*` or `Retry-After` header, signed or unsigned, and the OpenAPI document declares no
`429` response on any of its 14 operations. `docs/classic-api/general/limits` documents only
payload size (15 MB per request — use stashing above that) and per-endpoint row-count ceilings
(Create/Overwrite Table: 8,000,000 rows; Add Rows to Table: 250,000 rows) — capacity facts about a
single call, not a metered allowance that depletes with request volume.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | Atom feed: `status.glideapps.com/history.atom` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no readable rate-limit signal published |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` method's `test` hook |

## Icon

`assets/icon.svg` — the Glide mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/glide.svg>, downloaded 2026-09-06.

- **204 bytes**, `<title>Glide</title>`, `viewBox="0 0 24 24"`
- simple-icons' own metadata sources this from `brand.glide.page` (Glide's own brand-asset site,
  the same `glideapps.com` product this app integrates) — cross-checked to rule out the unrelated
  "Glide" messenger and "Glide" chargeback-recovery brands, neither of which this is
- inked `#18BED4`, simple-icons' hex for this brand
- **needed a dark variant**: the plain black mark fails the dark tile as-is (ΔE 15.2 / contrast
  1.34, measured 2026-09-06 by `_tools/icon-legibility.ts`) — `assets/icon.dark.svg` is the
  automated **reversed-mark** fix (`_tools/icon-legibility.ts fix`): the identical verbatim path
  data, re-inked to white
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the path data inside the
  nested `<svg>` is the vendor's, verbatim

Run `deno task fmt`, never bare `deno fmt` — the latter reformats `assets/` and would rewrite the
vendor's path data.

## Layout

```
glide/
├── index.ts                  # AppDefinition: 14 actions, 1 auth, 2 health checks
├── lib/client.ts              # base URL, envelope handling, error taxonomy, stash/If-Match validation
├── lib/params.ts               # shared Param fragments
├── auth/api-token.ts           # Bearer header, /tables probe (classified by body, never by status)
├── actions/                    # one file per action
├── health/                     # service (Atom feed) + quota (unavailable)
└── tests/                      # unit tests against a mocked HookContext
```

## Development

```bash
deno task test       # unit tests
deno task check       # typecheck
deno task lint
deno task validate    # manifest + sandbox conformance
deno task fmt          # NEVER bare `deno fmt` — it rewrites assets/icon*.svg
```

---

Researched and endpoint-verified 2026-09-06 against Glide's own OpenAPI 3.1 document
(`www.glideapps.com/docs/openapi.json`, "API Reference" v1.0.0, 14 operations) plus its linked
prose docs and live probes of `api.glideapps.com` and `status.glideapps.com`. Status surfaces move;
re-check if a probe starts failing for everyone at once.
