# Raindrop.io

Manage Raindrop.io bookmarks from a workflow: collections, raindrops (bookmarks), highlights, tags,
and the counts and search behind them.

- **API**: `https://api.raindrop.io/rest/v1` (REST v1)
- **Reference**: <https://developer.raindrop.io/> — the GitBook serves a Markdown projection of every
  page (append `.md` to a page URL); the index is <https://developer.raindrop.io/llms.txt>
- **Actions**: 39 · **Auth methods**: 2 · **Health checks**: 2 declared + 2 derived (`auth:*`)
- **Egress**: `api.raindrop.io` only. The status host is on the `service` check's own allowlist.

Everything below was verified on **2026-08-11** against the vendor's reference plus live probes
against `api.raindrop.io`, `raindrop.io/oauth/*` and `status.raindrop.io`. Nothing came from a
third-party integration directory.

---

## Five things that will cost you a day

### 1. HTTP 200 does not mean success — and 401 does not mean "bad token"

Raindrop's two surfaces disagree about where the verdict lives, and both disagree with the status
code.

The **OAuth token endpoint answers HTTP 200 when the exchange fails**, with the real status buried in
the body:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' -X POST \
    https://api.raindrop.io/v1/oauth/access_token \
    -H 'Content-Type: application/json' -d '{…bogus client…}'
200
$ # …and the body:
{"result":false,"status":400,"errorMessage":"client_id or client_secret is invalid"}
```

Anything that decides "did the exchange work?" from `res.ok` stores a credential that was never
issued, and the user gets a connection that looks healthy and fails on first use.

The **REST API returns the same 401 status for two different problems**, distinguishable only in the
body:

| Request                       | Status | `errorMessage`           | What it means                    |
| ----------------------------- | ------ | ------------------------ | -------------------------------- |
| no `Authorization` header     | 401    | `Unauthorized`           | the credential never arrived     |
| `Authorization: Bearer bogus` | 401    | `Incorrect access_token` | the credential was rejected      |

Different problems, different fixes — reconnect vs re-issue. This app therefore reads **every**
verdict from the body: `lib/client.ts` checks `result` separately from `res.ok`, and `auth/probe.ts`
branches on `errorMessage`, never on the status code alone.

### 2. An unauthenticated probe cannot tell a real path from a typo

Authentication runs **before** routing:

```console
$ curl -s https://api.raindrop.io/rest/v1/user
{"result":false,"status":401,"errorMessage":"Unauthorized","auth":false}
$ curl -s https://api.raindrop.io/rest/v1/nonexistent-zzz
{"result":false,"status":401,"errorMessage":"Unauthorized","auth":false}
```

Byte-identical, 72 bytes each. So the usual trick of poking an API to confirm a path exists proves
nothing here — and that matters because **the API is full of singular/plural pairs that are different
endpoints, not aliases**:

| Singular             | Plural                       |
| -------------------- | ---------------------------- |
| `/collection/{id}`   | `/collections` (root list)   |
| `/raindrop/{id}`     | `/raindrops/{collectionId}`  |
| `/backup` (generate) | `/backups` (list)            |

Plus `/collections/childrens`, which is spelled exactly like that. `tests/index.test.ts` derives
every path the actions build straight from their source and checks it against the documented set, so
a pluralisation slip fails a test rather than shipping.

### 3. `result: false` is sometimes the correct answer

Two endpoints use the envelope flag as *data*, not a verdict:

- `POST /import/url/exists` reports "none of these URLs is saved" as `{"result": false, "ids": []}` —
  a completely successful lookup. `actions/url-exists.ts` derives `found` from the `ids` array and
  reads the body with `json()` rather than the `result`-checking `ok()`.
- `GET /import/url/parse` reports a page it could not fetch as `result: **true**` *with* an `error`
  field and a best-effort `item` (`{"error":"not_found","errorMessage":"url_status_404",…}`). That is
  the vendor saying "here is the best I could do"; `actions/url-parse.ts` surfaces it as a
  `parseError` output field instead of failing the workflow run.

### 4. The same field name means different operations on different paths

- **`tags` replaces on `PUT /raindrop/{id}` and appends on `PUT /raindrops/{collectionId}`** — and on
  the second, `[]` is a *third* meaning: erase every tag. Update Raindrops exposes the erase as its
  own explicit toggle so "leave the field blank" and "send an empty array" can never be the same
  gesture.
- **Deleting a highlight is a `PUT` on its parent bookmark with an empty `text`**
  (`{"highlights":[{"_id":"…","text":""}]}`). There is no `DELETE` for a highlight. That is why this
  app ships Add / Update / Remove Highlight as three actions over one endpoint: a single edit form
  able to write `text` would destroy the record when someone cleared the box. Update Highlight
  exposes no `text` parameter at all.
- **Collection `0` works on the read paths and not on the write ones.** The vendor: "update or remove
  methods not support `0` yet." Both batch actions refuse it before the request.

### 5. The status page looks unclaimed and is not

`status.raindrop.io` answers **every** path with the same 511,148-byte HTML — the classic parked-host
signature:

| Path                                   | Status | Bytes   | md5 (first 12) |
| -------------------------------------- | ------ | ------- | -------------- |
| `/api/v2/status.json`                  | 200    | 511,148 | `5591268ebd7d` |
| `/api/v2/summary.json`                 | 200    | 511,148 | `5591268ebd7d` |
| `/api/v2/definitely-not-real-zzz.json` | 200    | 511,148 | `5591268ebd7d` |
| `/history.atom`                        | 200    | 511,148 | `5591268ebd7d` |
| **`/index.json`**                      | 200    | 43,414  | `02fa64f39610` |

It is a real, claimed **Better Stack** page — it has no `/api/v2/*` surface at all and `301`s every
unknown path to `/`. `GET /index.json` is JSON and self-identifies:

```json
{"company_name": "Raindrop.io", "company_url": "https://raindrop.io",
 "custom_domain": "status.raindrop.io", "aggregate_state": "operational"}
```

with five components — `Website`, **`API`**, `Web app`, `Search`, `Thumbnails`. DNS confirms it:
`status.raindrop.io` is a CNAME to `statuspage.betteruptime.com`.

---

## Authentication

Both methods are real and both are supported. Both sign with `Authorization: Bearer <token>`, the
only presentation the vendor documents — no `?access_token=` query form exists, so no credential ever
enters a URL.

### `test-token` — permanent test token (default)

Raindrop's App Management Console issues every registered application a **Test token** alongside its
OAuth credentials. The vendor's own guidance: "If you just want to test your application, or do not
plan to access any data except yours account you don't need to make all of those steps."

- **Never expires.** The two-week expiry applies to OAuth access tokens "except 'test tokens'". A
  monthly scheduled workflow works with this and needs a live refresh path with the other.
- **No redirect URL, no client secret, no browser round trip** — one field, pasted.
- **Its limit:** it authenticates as the account that *owns the app registration*. It cannot act for
  anyone else, so a multi-user integration needs OAuth.

Get it from raindrop.io → Settings → Integrations → (your app) → Test token.

### `oauth2` — any account

Standard authorization-code flow, host-managed.

| | |
| --- | --- |
| Authorize | `https://api.raindrop.io/v1/oauth/authorize` |
| Token / refresh | `https://api.raindrop.io/v1/oauth/access_token` |
| Scopes | **none** — Raindrop documents no `scope` parameter; a token is all-or-nothing |
| PKCE | **no** — not documented; declaring it would offer a challenge the vendor ignores |
| Expiry | access token 2 weeks; refresh with `grant_type=refresh_token` |

**The declared URLs are not the ones in the reference's prose.** The documented
`https://raindrop.io/oauth/*` endpoints `307`-redirect to `https://api.raindrop.io/v1/oauth/*`
(measured; the reference's own cURL example already uses the latter). Note `/v1/oauth/…`, **not**
`/rest/v1/oauth/…` — the OAuth routes sit outside the REST prefix. The final URLs are declared so a
client-secret-bearing `POST` never depends on a redirect being followed with method and body intact.
The token endpoint accepts both a JSON body and `application/x-www-form-urlencoded` (measured,
identical responses), so the host's standard form-encoded exchange helper works unmodified.

**No `refresh` hook is implemented**, deliberately: the refresh call needs the *application's* client
secret, which an App never holds — the host does. `refreshUrl` is declared instead. A hook forced to
invent a client secret would be worse than an absent one.

### Credential probe — `GET /rest/v1/user`

Chosen by reading the response schema field by field, not by its name.

- **It requires a credential** (401 unauthenticated, measured).
- **It returns no credential material.** This is the check that matters: a whoami is exactly where an
  API hands your own key back (Mailjet `/apikey`, Follow Up Boss `/me`, ElevenLabs `/v1/user`).
  Raindrop's User schema was walked in full — `_id`, `config`, `email`, `email_MD5`, `files.*`,
  `fullName`, `groups`, `password`, `pro`, `proExpire`, `registered`, six `<provider>.enabled`
  booleans. The one alarming name, **`password`, is a `Boolean`** ("Does user have a password"). No
  token, key or secret appears anywhere in it.
- **It is not scope-restricted**, because Raindrop has no scopes at all — the HubSpot/Shopify failure
  mode, where a probe needs a permission a good credential may legitimately lack, cannot arise here.

The response does carry the account's own `email`, so nothing returns the body: `test` returns
`{ok, message}`, `afterConnect` publishes only `fullName` + `_id`, and the `quota` check returns
numbers.

---

## Health checks

| Check | Kind | Source | Posture |
| --- | --- | --- | --- |
| `service` | service | [Better Stack](https://status.raindrop.io/index.json) | unsigned, `network.allow: ["status.raindrop.io"]` |
| `quota` | quota | `GET /rest/v1/user` | signed, per connection |
| `auth:test-token`, `auth:oauth2` | credential | derived from each `test` hook | — |

**`service`** reads `aggregate_state` for the verdict and one `status` per component for the detail —
both are the vendor's *own* status fields, never inferred from prose. It reports `unknown` (never
`down`) when the page itself fails, when the body is HTML (the host's catch-all, so `index.json` has
moved), or when the page stops self-identifying as Raindrop's after a rebrand.

**Why `index.json` and not the RSS feed.** `https://status.raindrop.io/feed.rss` is a genuine feed
(`application/rss+xml`, 9,391 bytes) that the spec's `feed:` declaration would parse for free — and it
is deliberately unused. Better Stack emits paired `"API went down"` / `"API recovered"` items sharing
one `<guid>`, so current state would have to be inferred from title prose. The pack's rule is to read
the vendor's own status field and never invent one; `index.json` has that field twice over. One
request either way.

**`quota`** reads two dimensions from one request:

- **Request rate**, from the response headers. Raindrop documents 120 requests/minute per
  authenticated user via `X-RateLimit-Limit` / `RateLimit-Remaining` / `X-RateLimit-Reset` — note the
  middle one carries no `X-` prefix in the vendor's table while its own 429 example prints
  `X-RateLimit-Remaining`; both spellings are read. **Their presence could not be verified at build
  time** (the limit is per *authenticated* user and no Raindrop credential was available; every
  unauthenticated response measured carried none). The check reports the dimension when the headers
  are there and **states their absence in its message** when they are not — it never fabricates a
  reading. `X-RateLimit-Reset` is UTC epoch **seconds**, converted accordingly.
- **File-upload allowance**, from `files.size` / `files.used`. Monthly, resetting at
  `files.lastCheckPoint`. This app declares no upload action, but a health check answers "is this
  account in trouble", and an account at its file ceiling is failing for its owner in Raindrop's own
  UI. A non-positive `size` is "not published", not "exhausted", and is skipped rather than scored.

Neither is ever reported as worse than the evidence supports: a 429 or an unreadable body is
`unknown`, and an exhausted one-minute request budget is `degraded`, never `down`.

---

## Actions

### Collections (11)

| Key | Method & path |
| --- | --- |
| `collection-list` | `GET /collections` — root only |
| `collection-children-list` | `GET /collections/childrens` — every nested collection, any depth |
| `collection-get` | `GET /collection/{id}` |
| `collection-create` | `POST /collection` |
| `collection-update` | `PUT /collection/{id}` |
| `collection-delete` | `DELETE /collection/{id}` — cascades; `-99` empties Trash permanently |
| `collection-delete-many` | `DELETE /collections` — does **not** cascade |
| `collection-merge` | `PUT /collections/merge` |
| `collection-reorder` | `PUT /collections` |
| `collection-clean-empty` | `PUT /collections/clean` |
| `cover-search` | `GET /collections/covers[/{text}]` |

The two delete actions differ in a way worth re-reading: the singular one removes a collection **and
all its descendants**, the plural one ignores nested collections unless their ids are listed. Root
collection *order* is not in these objects at all — it lives in the user's `groups[].collections`
array, which Get Account returns.

### Sharing (5)

`collection-sharing-list`, `collection-share`, `collection-unshare`, `collaborator-role-update`,
`collaborator-remove`.

`collection-share` sends real invitation emails (hence not idempotent) and enforces the vendor's
10-address ceiling client-side. `collection-unshare` is one route with two outcomes chosen by *who
you are* — an owner removes every collaborator, a member removes only itself — which is why
`collaborator-remove` exists for the targeted case.

### Raindrops (9)

`raindrop-get`, `raindrop-search`, `raindrop-create`, `raindrop-create-many` (max 100, enforced),
`raindrop-update`, `raindrop-update-many`, `raindrop-delete`, `raindrop-delete-many`,
`raindrop-suggest`.

- Paging is `page` (zero-based) + `perpage` (**50 max**, prefilled to 25). No cursor, no `total` — page
  until a short page comes back.
- `sort: score` only does something alongside a `search` term, and the option label says so.
- **Deleting a bookmark is recoverable exactly once**: it moves to Trash, but the same call against
  something already in Trash destroys it. Nothing in the request or response distinguishes the two.
- Raindrop does **not** deduplicate on `link` — its duplicate detection is a report (Get Filters), not
  a constraint — so "save it if I do not have it" is `url-exists` followed by a conditional create.
- `raindrop-suggest` covers both documented endpoints (`POST /raindrop/suggest` for a new URL,
  `GET /raindrop/{id}/suggest` for an existing bookmark) and requires exactly one of the two inputs.

### Highlights (4)

`highlight-list` (`GET /highlights[/{collectionId}]`), plus `highlight-add`, `highlight-update` and
`highlight-remove` — all three being `PUT /raindrop/{id}`, split for the reason in finding 4. List
items carry `raindropRef`, the id of the parent bookmark; it appears only in the reference's sample
response, not its field table, and it is what makes the endpoint useful.

### Tags (3)

`tag-list`, `tag-rename`, `tag-remove`. A tag's **name is its `_id`** — tags have no numeric identity,
which is why renaming one is a bulk re-tagging rather than a record update. **Rename and merge are
the same request**: `{tags: [...], replace: "new"}`, one string in for a rename, several for a merge.
The vendor documents them as two methods; they are one endpoint, so this app ships one action.

### Account, insight and import (7)

`user-get`, `user-stats-get`, `filter-list`, `url-parse`, `url-exists`, `backup-list`,
`backup-create`.

- **`user-get` returns only documented fields.** The vendor warns on four separate pages that
  responses "could contain other fields, not described above. It's unsafe to use them in your
  integration!" A workflow result is persisted and echoed into logs and previews, so this action
  projects the reference's own three field tables and drops everything else — building on fields the
  vendor has reserved the right to delete, and forwarding whatever Raindrop adds next, are both
  avoided by the same projection.
- **`user-stats-get` is filed under *Collection methods* in the reference**, where nobody looks for
  it, and is the only endpoint reporting the sizes of the three system collections plus account-wide
  `duplicates.count` / `broken.count`.
- **`filter-list` uses `/filters/{id}`, not `/raindrops/{id}/filters`** — the 1.0.4 changelog retired
  the second form, which is still what most third-party examples show.
- `backup-create` is a `GET` with side effects that answers a *sentence*, not JSON, and emails the
  account owner; it is typed `perform` regardless of its verb.

---

## Deliberately left out, and why

Each of these is a documented endpoint or field this app does **not** implement. None is "too hard" —
each is a specific thing that could not be got right from the reference, or that an Action is the
wrong shape for.

| Left out | Why |
| --- | --- |
| **The `reminder` field** on create/update | The reference's only mention spells the sub-field `reminder.**data**` ("`reminder.data` \| `Date` \| YYYY-MM-DDTHH:mm:ss.sssZ"), which reads like a typo for `date` and cannot be settled from any second source or sample. A wrong key is swallowed silently as an unknown field and the reminder never fires — so it is absent rather than guessed. Everything else on the body is confirmed by both a field table and a sample payload. |
| **Expand/collapse all collections** (`PUT /collections`) | The reference documents its `expanded` parameter under **"Path Parameters"** on a path that has no such segment. Body, query or path is unrecoverable from the documentation, and the sibling `sort` on the same route is documented as a *Request Body* field — so the two cannot even be assumed to agree. Per-collection `expanded` **is** implemented, on `collection-update`, where the reference is unambiguous. |
| **`PUT /user`** | The single endpoint mixes profile edits (`fullName`, `config`, `groups`) with **credential rotation** (`newpassword` / `oldpassword`). An action able to change an account's password from a workflow is a hazard far beyond the value of setting a display name. This is a scope judgement, not a documentation gap: the profile half is fully documented and could be added behind a narrower action if it is ever wanted. |
| **`GET /user/{name}`** (public profile) | The reference documents it, and the 1.0.4 changelog says "Route `GET /user/:id` removed". The two cannot both be current and there is no way to tell which won — and, measured, the path requires a credential despite being documented as public. Contradicted documentation, so it is out. |
| **File uploads** — `PUT /raindrop/file`, `PUT /raindrop/{id}/cover`, `PUT /collection/{id}/cover`, `POST /import/file` | All `multipart/form-data`. The blocker is not multipart: it is that the RFCs do not specify what a host hands a hook for a `type: "file"` param (a URL? bytes? a handle?), so there is no correct way to obtain the file's content inside `execute`. Implementable the moment that shape is specified. |
| **Export and backup download** — `GET /raindrops/{id}/export.{csv,html,zip}`, `GET /backup/{ID}.{format}` | These answer a *file* — and `zip` is binary, which does not survive a round trip through a JS string. An Action hands structured data to the next workflow step, not a document. `backup-list` returns the ids so a human or a file-aware step can fetch them. |
| **Permanent copy** — `GET /raindrop/{id}/cache` | Answers `307` to an S3 URL. Returning the `Location` needs `redirect: "manual"` to be honoured end-to-end by the host's mediated fetch, which is not part of the `ctx.fetch` contract; and following it reaches an S3 host no manifest can allowlist in advance. Unreliable either way, so it is out rather than flaky. |
| **Accept invitation** — `POST /collection/{id}/join` | Requires a secret token delivered by email to a human. Putting an out-of-band secret in an action param is exactly the pattern the credential model exists to prevent. |
| **Empty Trash** as its own action | It is `DELETE /collection/-99` — the same route `collection-delete` already uses. A separate action would make a permanent, unrecoverable operation look like an ordinary one; instead the id parameter's hint says exactly what `-99` does. |

## Icon

`assets/icon.svg` is the vendor's own mark, downloaded verbatim:

- **Source**: <https://help.raindrop.io/favicon.svg> (a `raindrop.io` host)
- **972 bytes**, md5 `e6a64a722107f2b4cc88171ef73fb96f`, 48×48, brand colours `#1988e0`, `#2cc3ed`,
  `#3147ff`

Cross-checked against an independent copy of the same mark
(`raw.githubusercontent.com/n8n-io/n8n/.../Raindrop/raindrop.svg`, 1,199 bytes, md5
`15a383d1a8b43d5765737190eaa1d2f2`): the two agree on the geometry and on the primary `#1988E0`, which
is what confirms this is the real Raindrop mark rather than a doc-host favicon. The first-party copy
is shipped. `raindrop.io` itself answers a 9-byte `text/plain` 404 for every SVG asset path, so the
apex-favicon route is closed; `tests/index.test.ts` pins the file's length and colours so a redraw
fails a test.

## Development

```bash
deno task validate   # manifest + spec conformance (../../_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # unit tests, mocked HookContext, no network
```

No runtime dependencies: `@w6w/types` is types-only.
