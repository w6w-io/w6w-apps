# CompanyCam

Photo documentation for contractors. This app reads and writes **projects** and everything filed
under them — photos, videos, documents, comments, checklists, labels — plus the **users**, **groups**,
**tags** and **webhooks** around them, over the CompanyCam Core API v2.

- **API**: `https://api.companycam.com/v2`
- **Auth**: `Authorization: Bearer <token>` — an access token from
  [app.companycam.com/access_tokens](https://app.companycam.com/access_tokens), or an OAuth 2.0
  access token
- **Actions**: 62, one per operation in the vendor's OpenAPI document
- **Health checks**: `service` (Statuspage) · ~~`quota`~~ (declared absence) · 2 derived `auth:*`

Everything here was verified on **2026-08-11** against CompanyCam's own OpenAPI 3.0 document —
[`github.com/CompanyCam/openapi-spec/openapi.yaml`](https://github.com/CompanyCam/openapi-spec/blob/main/openapi.yaml),
187,449 bytes, md5 `37293f27eff6886fbffe4c49e7f4f409`, last commit 2026-08-07 — which is the same
document ReadMe renders at `docs.companycam.com/reference/*`, plus the vendor's guides and
changelog and live probes against `api.companycam.com` and `status.companycam.com`. Nothing came
from a third-party integration directory.

---

## Read this first: the API this app targets has an announced end date

CompanyCam's own documentation banner, on every page of the reference:

> These docs are for the legacy API that will be **depreciating early 2027**. We will not be adding
> new functionality and will provide very limited support for the legacy API. If you are planning to
> build an integration … please look to the new CompanyCam API at
> [developers.companycam.com](https://developers.companycam.com/).

Three things follow, and they are the reason this section is at the top:

1. **A grep for `deprecat` does not find it.** The vendor spells it *depreciating*. Searching all 78
   reference and guide pages for `deprecat|sunset|will be removed|end of life` returns **zero
   matches**; the notice is only reachable by reading the banner. The API is otherwise entirely
   alive — the spec repo took a commit four days before this app was written.
2. **The successor could not be verified, so nothing here is built on it.**
   `developers.companycam.com` redirects to `/users/sign_in`; its `llms.txt`, `openapi.json`,
   `robots.txt` and `sitemap.xml` all answer `401`. Its `/api-reference` page loads a Scalar SPA
   whose spec URL is not in the public bundle. With no readable reference there is no way to confirm
   a base URL, a path, or a field, so this app targets the documented, live v2 API and says so
   rather than guessing at the replacement.
3. **"Early 2027" is a date, not a version policy.** Anything built on this app should expect a
   migration, and the migration will need the new API's docs — which today means an account.

---

## Three things that would have cost a day

### 1. An unknown endpoint answers `200`, not `404`

Measured on `api.companycam.com`:

| Request                                       | Answer                                          |
| --------------------------------------------- | ----------------------------------------------- |
| `GET /v2/projects` (no credential)            | `401` `{"errors":["Unauthorized"]}` (JSON)      |
| `GET /v2/not-a-real-endpoint-zzz`             | `302` → `https://api.companycam.com/users/sign_in` |
| …following that redirect                      | **`200`, 18,795 bytes of HTML**                 |

`fetch` follows redirects by default, so a mistyped path does not fail — it succeeds, with a login
form as the payload. `lib/client.ts` rejects any non-`204` success whose content type is not JSON,
and `tests/index.test.ts` checks every path an action builds against the 36 templates the OpenAPI
document declares, so a typo fails at test time rather than at 03:00.

The inverse is what makes the credential probe sound: **a JSON `401` from this API proves the path
exists**, which is why an unsigned probe answering `401` is a pass, not an outage.

### 2. The impersonation header is spelled two ways, and the wrong one fails silently

Fourteen write endpoints accept a header naming which CompanyCam user to credit for the write. The
vendor documents it twice, incompatibly:

- the **OpenAPI document** (and therefore every generated reference page): `X-CompanyCam-User`
- the **"Defining the Current User" guide** and its changelog entry: `X_COMPANYCAM_USER`

Those are different headers, not two renderings of one. `api.companycam.com` runs nginx (measured
from the `server:` response header), and nginx drops request headers containing underscores unless
`underscores_in_headers` is switched on; Rack maps the dashed form to the same
`HTTP_X_COMPANYCAM_USER` the application reads either way. So this app sends the dashed form the
machine-readable spec declares.

The failure mode of choosing wrong is the expensive kind: **no error**. The photo, comment or
document is simply credited to the token's owner instead of the crew member the workflow named, and
nobody notices until someone asks why the office manager took 400 photos.

### 3. Every list is a bare array, and the only pagination cursors live in headers

No list endpoint has an envelope. There is no `total`, no `next`, no `meta` — the body is a JSON
array and that is all, so "was that the last page?" is only answerable by asking for another one.

Two endpoints — `GET /v2/photos` and `GET /v2/projects/{id}/photos` — do have cursor pagination, and
its entire surface is **response headers**: `X-Next-Cursor`, `X-Prev-Cursor`, `X-Has-Next`,
`X-Has-Prev`. A client that only looks at the payload cannot see them, and offset paging over a
collection that grows while you read (which is what a photo collection does) silently skips rows.
This app surfaces all four as outputs, so a workflow pages with `after: {{previous.nextCursor}}`.

`GET /v2/videos` says in prose that it "supports the same filtering and pagination parameters as
`/photos`", but its own parameter list declares no `after`/`before` and its responses declare no
cursor headers — so this app does not send them there. See "What was deliberately left out".

---

## Authentication

Two methods, both presenting `Authorization: Bearer <token>` on the same endpoints:

| Method             | Type     | Use when                                       |
| ------------------ | -------- | ---------------------------------------------- |
| **Access Token**   | `bearer` | Integrating your own CompanyCam account        |
| **OAuth**          | `oauth2` | Publishing an integration other companies use  |

**Access token.** Generated by the account holder at `app.companycam.com/access_tokens`. It carries
the whole account — CompanyCam applies no scopes to access tokens — so a connection made this way
can do everything this app can do, deletions included.

**OAuth.** Authorization code flow on `app.companycam.com` (`/oauth/authorize`, `/oauth/token`), with
the three scopes CompanyCam defines: `read`, `write`, `destroy`, space-delimited. Access tokens
expire after 7,200 seconds and refresh tokens **rotate** on every refresh, so `refreshUrl` is
declared and the host owns renewal. PKCE is not enabled: the vendor documents a confidential client
sending `client_secret` and never mentions `code_challenge`, and claiming PKCE would advertise a
protection the server may simply ignore. A client id and secret are issued by CompanyCam on request
and live on the w6w server, never in this package.

The OAuth endpoint host is allowlisted implicitly by the runtime, which is why `w6w.network.allow`
contains only `api.companycam.com`.

### Credential probe: `GET /v2/users/current`

Chosen by reading the response schema and measuring the wire, not by its name:

- **It requires a credential.** Unauthenticated it answers `401 {"errors":["Unauthorized"]}`; so
  does a syntactically plausible fake token. There is no endpoint under `/v2` that answers `200`
  without a credential, so the "probe passes for a connection whose key never attached" trap does not
  arise here.
- **It needs no scope.** An OAuth token granted only `read` reaches it.
- **It returns no credential material.** Compare `GET /v2/webhooks`, which needs a credential and
  looks like a fine liveness check — and returns `token` on every row. See below.

**The probe cannot tell a missing credential from a revoked one, and says so.** Both answer
`401 {"errors":["Unauthorized"]}`, byte for byte (measured with no header, and with
`Authorization: Bearer deadbeef…`). The failure message names both causes rather than picking one and
being wrong half the time, and it never echoes the credential.

---

## Secrets this app removes from responses

`Webhook.token` is documented as "a string used to hash the webhook body for verification" — it is
the HMAC-SHA1 key CompanyCam signs every delivery with, and the key a receiver compares against the
`X-CompanyCam-Signature` header. **Anyone holding it can forge a delivery that validates.**

It comes back on every webhook read (`GET /v2/webhooks`, `GET /v2/webhooks/{id}`) and on create and
update. A workflow step's result is persisted in the run record and routinely echoed into logs and
previews, so returning it would turn a routine list call into a durable secret leak. All four
actions delete it before returning; nothing else in the response is altered. `tests/index.test.ts`
derives the set of actions that read a webhook body from their own source and asserts it equals the
set that strips — both directions, so neither a new leaky action nor a decorative strip call passes.

The value stays available to whoever created the webhook: it is theirs, they chose it.

Two other capability-bearing values are returned **on purpose**, because they are the deliverable
rather than an incidental leak, and their actions say so plainly:

- `ProjectInvitation.invite_url` — whoever opens it joins the project. Minting it is the entire
  point of `project-invitation-create`; CompanyCam does not deliver it, the workflow does.
- `Document.url` and photo `uris` — links to `static.companycam.com`, which this app never calls.

---

## Photos and documents: what the sandbox can and cannot express

The w6w runtime stringifies a request body before it crosses to the host, so **no action can send
raw binary**. That rules an integration out of most photo APIs. CompanyCam's is not one of them:

- **`POST /v2/projects/{id}/photos` takes a hosted URL.** The body is
  `{"photo": {"uri": "https://…", "captured_at": 1637770053, …}}` — ordinary JSON, and CompanyCam
  fetches the image itself. **This is implementable, and it is implemented** (`project-photo-create`).
  Three consequences: the URL must be reachable from the public internet (not from w6w); ingestion is
  asynchronous, so the `201` carries `processing_status: "pending"` and the photo is not viewable
  until that reaches `processed`; and `captured_at` is a Unix timestamp **in seconds**, is required,
  and is what every date filter in this API sorts on.
- **`POST /v2/projects/{id}/documents` takes base64 text.** `{"document": {"name": "test.txt",
  "attachment": "VGVzdAo="}}`, with a documented 30 MB limit on the decoded file. Also JSON, also
  implemented (`project-document-create`). Base64 inflates by about a third, so a 30 MB file is a
  ~40 MB request body; encoding is the caller's job.

There is **no multipart endpoint anywhere in this API**, and no video upload endpoint at all —
videos can be listed and read, never created.

---

## Health checks

| Check       | Kind      | What it answers                                    |
| ----------- | --------- | -------------------------------------------------- |
| `service`   | service   | Is CompanyCam up? (Statuspage, unsigned)            |
| ~~`quota`~~ | quota     | Declared absence — nothing published to read        |
| `auth:access-token`, `auth:oauth2` | credential | Derived from each method's `test` hook |

**`service`** reads `https://status.companycam.com/api/v2/summary.json`. Verified four ways:

- a bogus sibling path (`/api/v2/definitely-not-real-zzz.json`) returns **404 / 0 bytes**, while
  `summary.json` (2,481 B) and `status.json` (233 B) return different real payloads — so it is not a
  catch-all;
- `application/json`, parsing as the Statuspage v2 schema, and matching neither the ~127,700 B
  unclaimed-`statuspage.io` HTML signature nor the ~216,800 B unclaimed-`instatus.com` one;
- `page.name == "CompanyCam"`, `page.id == "y2vs4kl36flt"`;
- **it has an API component.** One of the seven is named `API` (id `n5595r721mdr`, created
  2020-05-13), alongside `Web App`, `Uploads & Processing`, `Search`, `Mobile App`, `Integrations`
  and `Notifications`. A status page that only reported the web app would say nothing about whether
  this app's calls work. `Uploads & Processing` matters too: it is the component that decides whether
  a photo created from a URL ever finishes processing.

The host called is `status.companycam.com` exactly — measured as a direct `200`, no redirect — and it
is declared in the check's own `network.allow` with `credential: "none"`, never in the app's
allowlist. A status host must not be reachable from a signed request.

**`quota` is a declared absence with `severity: "informational"`.** CompanyCam publishes no
rate-limit signal anywhere that was looked: the OpenAPI document declares response headers on exactly
two operations and all four are pagination cursors; live responses carried no `X-RateLimit-*` or
`RateLimit-*` header of any spelling; the docs never mention a limit, a quota or a `429`, and `429`
appears as a documented status on none of the 62 operations. There is no metering endpoint to read
instead — `GET /v2/company` returns id, name, status, address and logo, with no plan or usage field.
`informational` is load-bearing: an `unavailable` entry always reports `unknown`, and `unknown`
outranks `ok` in the roll-up, so at any other severity this honest statement would pin the app at
`unknown` forever.

---

## Actions

62 actions, one per operation in the OpenAPI document.

| Resource   | Actions |
| ---------- | ------- |
| Projects   | `project-list` · `project-get` · `project-create` · `project-update` · `project-delete` · `project-archive` · `project-restore` · `project-notepad-update` |
| Project contents | `project-photo-list` · `project-photo-create` · `project-video-list` · `project-document-list` · `project-document-create` · `project-comment-list` · `project-comment-create` · `project-label-list` · `project-label-add` · `project-label-delete` · `project-checklist-list` · `project-checklist-create` · `project-checklist-get` |
| Project people | `project-assigned-user-list` · `project-user-assign` · `project-user-remove` · `project-collaborator-list` · `project-invitation-list` · `project-invitation-create` |
| Photos     | `photo-list` · `photo-get` · `photo-update` · `photo-delete` · `photo-tag-list` · `photo-tag-add` · `photo-comment-list` · `photo-comment-create` · `photo-description-update` |
| Videos     | `video-list` · `video-get` |
| Tags       | `tag-list` · `tag-get` · `tag-create` · `tag-update` · `tag-delete` |
| Checklists | `checklist-list` · `checklist-template-list` |
| Groups     | `group-list` · `group-get` · `group-create` · `group-update` · `group-delete` |
| Users      | `user-list` · `user-get` · `user-current-get` · `user-create` · `user-update` · `user-delete` |
| Company    | `company-get` |
| Webhooks   | `webhook-list` · `webhook-get` · `webhook-create` · `webhook-update` · `webhook-delete` |

### Idempotency

**This API has no idempotency key.** No header, no body field, no create-or-update endpoint — the
only exception-shaped thing is that `PUT`/`PATCH`/`DELETE` are naturally idempotent. So the thirteen
actions that create a record declare `idempotent: false`, and a retried step will create a second
one:

`project-create` · `project-photo-create` · `project-document-create` · `project-comment-create` ·
`project-invitation-create` · `project-checklist-create` · `project-label-add` · `photo-comment-create` ·
`photo-tag-add` · `tag-create` · `group-create` · `user-create` · `webhook-create`

A workflow that syncs jobs from a CRM should search first (`project-list` with `query`) rather than
rely on the platform to de-duplicate. `project-label-add` and `photo-tag-add` are on the list because
the vendor documents no de-duplication for them either; if they turn out to be no-ops in practice the
cost is a retry that did not happen, which is the cheaper mistake.

`photo-description-update` is the odd one: a `POST` marked idempotent. It sets one scalar field
(`{"description": "…"}`), the vendor's own operation id is `updatePhotoDescription`, and writing the
same text twice leaves the same text.

### Vendor asymmetries the actions paper over (and document)

These are all the vendor's, transcribed rather than smoothed away:

- **`POST /v2/users` nests under `user`; `PUT /v2/users/{id}` does not.** Same resource, two body
  shapes. Sending the wrong one is accepted and changes nothing.
- **`POST /v2/photos/{id}/descriptions` is flat; `PUT /v2/photos/{id}` nests under `photo`.**
- **Project labels nest (`{"project": {"labels": […]}}`); photo tags do not (`{"tags": […]}`).**
- **Tags and labels take display strings and create unknown values on the fly; group members take
  ids.** Identical-looking `string[]`, opposite meanings — and a typo in a tag permanently adds a
  tag to the company vocabulary.
- **`PATCH /v2/projects/{id}/archive` is the only `PATCH` in the API**, and its counterpart
  `restore` is a `PUT`.
- **`PUT`s that answer `201`**: notepad, photo update, tag update, group update, webhook update,
  assign-user. Nothing was created.
- **`GET /v2/projects/{id}/checklists` accepts no pagination at all**, unlike the company-wide
  `GET /v2/checklists`. `GET /v2/templates/checklists` accepts nothing at all.
- **Webhook events call a checklist a `todo_list`** (`todo_list.created`, `todo_list.completed`,
  `todo_list.deleted`) — the only place in the API with that spelling.
- **`modified_since` on `GET /v2/projects` is ISO 8601**; every other timestamp in the API, in both
  directions, is a Unix integer in seconds.
- **`GET /v2/projects` returns deleted projects by default.** "When omitted, projects of all
  statuses are returned" — a sync that does not set `status=active` re-imports what the customer
  deleted.

### Webhooks

`webhook-create` takes the signing `token` **you** choose — CompanyCam does not generate one — and
signs every delivery with base64 HMAC-SHA1 of the raw body in `X-CompanyCam-Signature`. Omit it and
a receiver cannot distinguish a real delivery from anyone who guesses the URL.

Delivery rules, documented and worth knowing before wiring one up: a delivery must answer **exactly
`200`**; anything else is retried with exponential backoff up to 10 attempts, and **a webhook whose
total error count passes 25 is disabled**, with the counter resetting only on success. A receiver
that answers `202` on purpose will be switched off after 25 events, silently. `webhook-update` with
`enabled: true` is the only way back.

The 29 scopes are the vendor's closed list, offered verbatim as options. Note there is **no
`photo.deleted`, no `user.*` and no `webhook.*` event** — a workflow cannot learn from a webhook that
a photo went away.

---

## What was deliberately left out, and why

- **Multi-id filters.** `project_ids` / `user_ids` / `group_ids` / `tag_ids` are typed as arrays in
  the OpenAPI document, but it declares no `style`/`explode`, and the vendor's own generated Postman
  collection sends a single scalar per key. A Rails backend reads `?user_ids=1&user_ids=2` as the
  **last value only**, `?user_ids[]=1&user_ids[]=2` as a list, and `?user_ids=1,2` as a string —
  three incompatible readings, none documented, and the wrong one fails *silently* by filtering on
  one id instead of erroring. A single value behaves identically under all three, so each filter
  accepts one id. Nothing here guesses at the array encoding.
- **Cursor pagination on the video endpoints.** Claimed in prose, absent from the parameter list and
  from the declared response headers. Sending an undeclared cursor is exactly how a workflow ends up
  re-reading page one forever.
- **Triggers.** CompanyCam's webhooks would make a good `TriggerDefinition` (subscribe on
  `onSubscribe`, verify `X-CompanyCam-Signature` on ingest), but triggers are out of scope for this
  pack's apps and are not added speculatively. All five webhook management actions are here, so a
  workflow can still register and maintain a subscription against an endpoint of its own.
- **Anything from the successor API.** See the top of this file: its reference is behind a login, so
  no path, field or base URL could be confirmed.
- **Downloading documents or photos.** `Document.url` and photo `uris` point at
  `static.companycam.com`. That host is not in `network.allow` and this app never calls it —
  fetching bytes belongs to whichever step actually needs them.

---

## Icon

`assets/icon.png` is the vendor's own file, downloaded verbatim from
`https://companycam.com/apple-touch-icon.png`:

- **7,213 bytes**, `image/png`, 76×76 RGBA
- md5 `411d86ab3dd3b5efe6d879ea59c5d31b`
- sha256 `28a893c26f47dce1ddcea12e8b8780d332e7161d5539bbb9fa996a12f778d09e`

Byte-identical bytes are served from `https://assets.c.companycam.com/apple-touch-icon.png` (same
md5), which is the corroboration that this is the vendor's mark and not a CDN placeholder. Both the
size and the sha256 are asserted in `tests/index.test.ts`, so a re-encode or a redraw fails the
suite.

`https://assets.c.companycam.com/safari-pinned-tab.svg` is a real vendor SVG (1,860 bytes, md5
`89b882fa0a62b2459d87f65b075e5de9`) but it is a potrace-generated **monochrome mask icon** — a solid
black silhouette with no brand colour — so the colour PNG was preferred. `companycam.com/favicon.svg`
is not an icon at all: it is a ~232 KB HTML catch-all page.

---

## Development

```bash
deno task validate   # manifest + sandbox rules (../../_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # 195 unit tests, mocked HookContext, no network
```

Tests never touch the network: every hook is called with a mocked `HookContext` whose `fetch` serves
a queued response and records the request. Several are derived rather than hand-listed — the request
path of every action is checked against the 36 documented path templates, and the set of actions that
read a webhook body is derived from source and asserted equal to the set that strips its token — so a
new action is covered the moment it is written.

### Sources

| What | Where |
| ---- | ----- |
| OpenAPI 3.0 document | [`CompanyCam/openapi-spec`](https://github.com/CompanyCam/openapi-spec/blob/main/openapi.yaml) |
| Reference (renders that document) | https://docs.companycam.com/reference/getting-started |
| Getting started / auth | https://docs.companycam.com/docs/getting-started |
| OAuth 2.0 | https://docs.companycam.com/docs/oauth |
| Webhooks (scopes, retries, signature) | https://docs.companycam.com/docs/webhooks-1 |
| Defining the current user | https://docs.companycam.com/docs/defining-the-current-user |
| Status | https://status.companycam.com/api/v2/summary.json |
