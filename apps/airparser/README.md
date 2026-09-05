# Airparser

Parse emails and documents — PDF, DOCX, XLSX, CSV, HTML, images and more — into structured JSON
using an AI extraction schema, on Airparser's **Public API**.

- **Categories** — ai, documents
- **Auth methods** — api-key
- **Actions** — 11
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.airparser.com` (the `service` check adds `status.airparser.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://airparser.com
- **API docs** — https://help.airparser.com/public-api/public-api
- **Status page** — https://status.airparser.com

Airparser turns an inbox — a folder-like container with its own extraction schema — into an AI
document parser: upload something to it, get back the fields you defined as JSON. If the inbox has
no schema yet, uploading its first document generates one automatically from that document's
content, so there is nothing to configure before the first parse.

> **Everything below was verified against Airparser's own documentation on 2026-09-05** — the single
> article at `help.airparser.com/public-api/public-api` (~132 KB, fetched directly; there is no
> separate OpenAPI document) — plus live, unauthenticated probes against `api.airparser.com` and
> `status.airparser.com`. Nothing here came from a third-party integration directory.

## The four things most likely to cost you time

### 1. A missing key and a wrong key are byte-identical on the wire

Measured against `GET /inboxes`:

| Request                           | Status | Body                                          |
| ---------------------------------- | ------ | ---------------------------------------------- |
| No `X-API-Key` header at all       | 401    | `{"statusCode":401,"message":"Unauthorized"}`  |
| `X-API-Key: totally-fake-key-123`  | 401    | `{"statusCode":401,"message":"Unauthorized"}`  |

Same status, same body, same `content-length`, same `etag`. Airparser's docs only promise "the API
returns HTTP 401 Unauthorized" for an unauthenticated request, and the wire confirms there is no way
to tell "the key never reached the request" apart from "the key is wrong." `auth/api-key.ts`'s `test`
hook says exactly that in its failure message rather than guessing which one happened — see
[`lib/client.ts`](lib/client.ts) for the full write-up.

Every error response observed — including a plain 404 for an unknown route — comes back in the same
shape, `{"statusCode", "message", "error"?}`, which is Nest.js's own default exception body rather
than anything Airparser designed on purpose. `formatAirparserError` reads it and also joins
`message` when it arrives as an array (Nest's `class-validator` shape for a body with several
invalid fields at once).

### 2. Sync upload rejects ZIP; async upload accepts it

`POST /inboxes/{id}/upload-sync` and `POST /inboxes/{id}/upload` both take the same `file` field, but
only the async endpoint documents ZIP support — sync mode explicitly does not accept one. Both cap at
20 MB. Reach for `document-parse-async` for a bulk ZIP import; `document-parse-sync` for everything
else when you want the result in the same call.

Sync mode also has a soft timeout, not a hard failure: if parsing has not finished after ~60 seconds
it still answers **`200`**, with `parsing_in_progress: true`, a `doc_id` you can poll later with
`document-get`, and every other field `null`. A workflow branching on this action's result has to
check `parsing_in_progress`, not just the call's success.

### 3. `schema-update` and `schema-clone` return a bare boolean, not an object

The docs are explicit: "Returns `true` if the schema was updated successfully" / "Returns `true` if
the schema was successfully cloned, otherwise `false`" — the entire JSON response body is that one
boolean, not `{"result": true}` or similar. Both actions here wrap it in a named field
(`{ updated: bool }` / `{ cloned: bool }`) so a workflow has something to read by key rather than
parsing a bare `true`/`false` as its whole payload.

### 4. The `status` list filter's array wire format is not documented

`GET /inboxes/{id}/docs` documents `status` as "array of document statuses" but shows no example of
how an array is encoded in a query string. [`lib/client.ts`](lib/client.ts) sends it as a repeated
`status=` query parameter (`?status=parsed&status=fail`) — the conventional Express/Nest reading —
but this has **not** been confirmed against a live account. If Airparser instead expects a single
comma-joined value, the filter would silently return an unfiltered list rather than erroring.
`actions/document-list.ts` repeats this caveat at the call site.

## Auth

One method: `api-key`, type `apiKey`, header `X-API-Key`.

There is exactly one auth scheme in the docs — no OAuth surface, no basic auth. The credential is a
single opaque key from the account's settings page.

### The probe is `GET /inboxes`, and it was picked for what it does *not* return

Airparser's Public API documents no `/whoami`, `/me` or `/account` endpoint of any kind, so unlike
Mailjet's `/apikey` or Follow Up Boss's `/me` — both of which echo the caller's own credential back —
there is no such trap to avoid here. `GET /inboxes` was chosen instead because it:

- **requires a credential** (401 either way — see finding 1 above),
- **returns nothing but the caller's own inbox configuration** — no key, no token, nothing that could
  stand in for one, and
- **needs no id the caller might not have yet**, unlike every document/inbox/schema action here,
  every one of which needs an inbox or document id.

## Actions

11 actions. `resource` groups them in the editor.

| Key                        | Type    | Endpoint                                       |
| --------------------------- | ------- | ----------------------------------------------- |
| `document-parse-sync`       | perform | `POST /inboxes/{inboxId}/upload-sync`           |
| `document-parse-async`      | perform | `POST /inboxes/{inboxId}/upload`                |
| `document-get`              | read    | `GET /docs/{documentId}`                        |
| `document-get-extended`     | read    | `GET /docs/{documentId}/extended`               |
| `document-list`             | search  | `GET /inboxes/{inboxId}/docs`                   |
| `inbox-create`              | perform | `POST /inboxes/create`                          |
| `inbox-list`                | search  | `GET /inboxes`                                  |
| `inbox-get`                 | read    | `GET /inboxes/{inboxId}`                        |
| `inbox-delete`              | perform | `DELETE /inboxes/{inboxId}`                     |
| `schema-update`             | perform | `POST /inboxes/{inboxId}/schema`                |
| `schema-clone`              | perform | `POST /inboxes/{inboxId}/schema-clone`          |

### Idempotency

`document-parse-sync`, `document-parse-async` and `inbox-create` are `idempotent: false` — Airparser
documents no idempotency key for any of them, and every call bills a new parse or creates a new
inbox. A runtime retry on a transient network error must not repeat these automatically.

`inbox-delete`, `schema-update` and `schema-clone` are `idempotent: true` — a delete leaves nothing
left to delete twice, and reposting the same schema (or re-cloning from the same source) just
restates the same end state rather than compounding it.

### Notes on individual actions

- **`document-parse-async`'s response shape is a documented gap, not an oversight.** The docs state
  only "Returns: document ID" for this endpoint, without a sample body — unlike the sync upload,
  whose full response is shown. This action returns the JSON body verbatim rather than assuming the
  field is named `doc_id` here just because it is on the sync upload and on `document-get`.
- **`document-get-extended` returns an undocumented `secret` field**, listed among its "typical
  response fields" with no explanation of what it grants. This is *not* treated the way `apps/apify`
  treats `proxy.password` / `urlSigningSecretKey` — those are stripped because their purpose and
  blast radius are independently confirmed in Apify's own schema docs. Nothing in Airparser's docs
  says what `secret` does, so guessing and silently dropping it would be inventing behavior the docs
  don't support. It is passed through unaltered; treat an extended document read as data that may
  carry a token-shaped field until Airparser documents otherwise.
- **`schema-update`'s `fields` param is a free-form JSON array**, not a generated form. The docs
  define four field shapes (`scalar`, `list`, `object`, `enum`), with `list`/`object` nesting their
  own `attributes` recursively — reconstructing that as a form seemed more likely to drift from the
  spec than exposing it as JSON with the validation rules stated in the param hint (lowercase
  `[a-z0-9_]` names, unique within scope, max 100 chars, etc.).
- **Auth guards run before route/param validation.** `GET /docs/does-not-exist` and
  `GET /nonexistent-route` both still answer `401` when unauthenticated rather than `404` — measured
  directly, not assumed.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

Airparser publishes at **`status.airparser.com`**, a custom-domain **Better Stack** page (its own
`<title>` reads "Better Stack").

**(a) Bogus sibling paths — is this a catch-all?** No. The Statuspage-shaped guesses
(`/api/v2/summary.json`, `/history.atom`, `/api/v2/components.json`) all **301 redirect**, and so does
a nonsense path (`/definitely-not-real-zzz.json`). Better Stack's own JSON document lives at a
different, un-prefixed path:

| Path                             | Status | Bytes   |
| --------------------------------- | ------ | ------- |
| `/index.json`                     | 200    | ~34,800 |
| `/definitely-not-real-zzz.json`   | 301    | 0       |

**(b) Content-type and body.** `/index.json` parses as Better Stack's own
`{"data": {"type": "status_page", "attributes": {...}}, "included": [...]}` shape.

**(c) Does the page describe *this* product?** Yes —
`"attributes": {"company_name": "Airparser", "company_url": "https://airparser.com", "custom_domain":
"status.airparser.com", "aggregate_state": "operational"}`, with resources named "Airparser API",
"Airparser MCP Server", "airparser.com" and "Airparser App".

Severity is left at the `degraded` default for `kind: "service"`: Airparser's docs describe no
self-hosted deployment option, so every Connection this app can hold runs on exactly the
infrastructure this page describes.

### ~~`quota`~~ — a declared absence, at `informational` severity

Airparser's Public API documents no account-level credit balance, plan-limit or rate-limit endpoint
of any kind, and no response observed on the wire — including the 401 bodies above — carries a
rate-limit header. `document-get` exposes a per-document `credits` figure (what one parse cost), but
that is consumption, not headroom, and there is no documented way to read the account's remaining
balance against it. `severity: "informational"` matters here: an `unavailable` check always reports
`unknown`, which outranks `ok` in the roll-up, so at the `kind: "quota"` default of `degraded` this
would pin the app's health at `unknown` forever for a dimension that simply cannot be read.

## Deliberately not covered

Airparser's Public API article documents exactly the 11 endpoints above — this app covers all of
them. Nothing was left out for scope; what is genuinely absent from the vendor's own docs (and so is
absent here too):

- **Any credit/quota/rate-limit read** — see the `quota` health check above.
- **Any account/whoami endpoint** — see Auth above; this is a feature for the credential probe, not a
  gap in the app.
- **Webhook/Zapier/Make/n8n/Google Sheets configuration** — the docs describe these as delivery
  integrations configured in the Airparser app itself (see the "Data Export & Integrations" section
  of the knowledge base), not as Public API operations. Once a document is parsed, `document-get`
  reaches the same result these integrations receive.
- **A Postman collection** the article links as an attachment — not fetchable from this app's
  sandbox (it is a downloadable file, not a documented endpoint), and every field visible in the
  article's own prose and sample JSON is already covered by the actions above.

## Icon

`assets/icon.svg` is Airparser's own two-tone "A" mark, **traced** from
`https://airparser.com/logos/airparser.png` (662×662 RGBA PNG) on 2026-09-05 — there is no
vendor-published vector mark: the marketing site ships only PNGs (`logo.png`, `logo_full.png`,
`logos/airparser.png`), and both `help.airparser.com/favicon.ico` and every `favicon.svg` /
`apple-touch-icon.png` guess on either host either serve a raster `.ico` or 404. The PNG's alpha and
color channels were read directly (no image library available in this environment), traced to a
polygon outline via marching squares at the anti-aliased boundary, and normalized onto this pack's
`0 0 100 100` canvas the same way `_tools/icon-normalize.ts` frames every other app's mark. The two
brand colors were sampled from the source pixels and are exact: `#0A5CED` (bright blue, 157,498
matching pixels) and `#023C91` (navy, 79,575 matching pixels). A test in
[`tests/index.test.ts`](tests/index.test.ts) pins both colors and the canvas convention.

Both colors independently clear this pack's icon-legibility bar (`_tools/icon-legibility.ts`) against
both the light (`#f0f2f6`) and dark (`#1f232c`) tile — ΔE 98.4/85.1 for the blue and 86.0/50.4 for the
navy — so no `appearance.darkMode.icon` variant is needed.

## Layout

```
airparser/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/
│   └── client.ts             # AirparserClient, error formatting, the dual-401 + bare-boolean findings
├── auth/api-key.ts           # X-API-Key: sign, test
├── actions/                  # one file per action (11)
├── health/
│   ├── service.ts            # status.airparser.com (Better Stack)
│   └── quota.ts              # declared absence, informational
├── assets/icon.svg           # vendor mark, traced from the PNG logo and normalized
└── tests/                    # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — mangles assets/icon.svg
deno task test
```
