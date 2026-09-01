# Lokalise

Manage Lokalise projects, keys, translations, languages, files, contributors, tasks and webhooks,
on the **Lokalise REST API v2**.

- **Categories** — developer-tools, cms
- **Auth methods** — api-token
- **Actions** — 31
- **Health checks** — 3 (`service`, `quota`, `request-rate`) + the derived `auth:api-token`
- **Egress allowlist** — `api.lokalise.com` (the `service` check adds `status.lokalise.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://lokalise.com/
- **API docs** — https://developers.lokalise.com/reference/lokalise-rest-api
- **OpenAPI** — https://developers.lokalise.com/openapi/lokalise-api-without-branches.yml
  (served as JSON despite the `.yml` extension)
- **Status page** — https://status.lokalise.com/

Lokalise stores localizable strings as **keys**, each with a **translation** per project
**language**, organized into **projects** and exportable as **files** in whatever format a
platform (iOS, Android, web, ...) expects. This app covers the path a workflow actually needs
around that core content, plus **contributors** (who can translate what), **comments**
(in-context notes on a key), **tasks** (assigning translation work with a due date) and
**webhooks** (reacting to a translation event instead of polling for it).

> **Everything below was verified against Lokalise's own sources on 2026-09-01** — its
> machine-readable OpenAPI 3.0.3 document
> ([`developers.lokalise.com/openapi/lokalise-api-without-branches.yml`](https://developers.lokalise.com/openapi/lokalise-api-without-branches.yml),
> 270,538 bytes), the `developers.lokalise.com` reference pages it links, and live probes against
> `api.lokalise.com` and `status.lokalise.com`. Nothing here came from a third-party integration
> directory.

## The findings that would have cost someone a day

### 1. Every "create" endpoint is bulk-only

There is no single-item create anywhere in this API. `POST /projects/{id}/keys` always takes
`{"keys": [...]}`, even for one key — the same shape for languages, contributors and comments.
Sending a bare object is rejected outright, not accepted as a shorthand.

**And a `200` can still carry per-item failures.** The response is `{..., "keys": [...succeeded],
"errors": [...failed]}` — one HTTP status, partial success. Lokalise's own docs give the example of
creating two keys where one name is already taken: the response is a `200` with one entry in `keys`
and one `{message, code, key_name}` in `errors`. Every bulk-create action here (`key-create`,
`language-create`, `contributor-create`, `comment-create`) returns both arrays rather than assuming
a `200` means every item landed.

### 2. A `200` on a delete does not always mean the resource is gone

Lokalise's own documented example response for deleting a key is
`{"project_id": "...", "key_removed": false, "keys_locked": 1}` — a `200` where the key was **not**
removed, because it is locked by an active task. `project-delete` has the same shape
(`project_deleted: boolean`). Both actions here return the boolean field rather than assuming
success from the status code, and a test pins the locked-key case so a future refactor cannot
silently start reporting it as removed.

### 3. The documented auth error code and the observed one disagree

Lokalise's error-codes page documents `401 Unauthorized` as "No valid API key provided." Live
probes on 2026-09-01 against `api.lokalise.com/api2/projects` show that is only half true:

| Request | Status | Body |
|---|---|---|
| No `X-Api-Token` header at all | **400** | `{"error":{"message":"Invalid \`X-Api-Token\` header","code":400}}` |
| A syntactically wrong (bad length/charset) token | **400** | same as above |
| A well-formed but wrong/revoked token | **401** | `{"error":{"message":"Unauthorized","code":401}}` |

A health probe that only branches on `401` misreports the first two cases — the credential never
reaching the request in valid form at all — as some other kind of failure. `auth/api-token.ts`
treats both as "bad credential" and distinguishes them in the message.

### 4. Project type silently changes which actions even apply

Per-key deletion (`key-delete`, `DELETE /projects/{id}/keys/{key_id}`) works on **Software** and
**Marketing** projects but is **not supported on Documents** projects (keys there are managed
through file operations). Per-file deletion (`file-delete`) is the **exact opposite**: supported on
Documents and Marketing, not on Software. Neither action tries to detect the project type in
advance — Lokalise's own `400 "Action not supported by this type of project"` is surfaced verbatim.

### 5. Rate-limit headroom is genuinely readable here

Unlike several vendors in this pack (Apify among them), Lokalise sends real, currently-usable
rate-limit headers on **every** response, including a bare `401` — `x-ratelimit-limit`,
`x-ratelimit-remaining`, `x-ratelimit-reset` — measured live 2026-09-01 as
`x-ratelimit-limit: 10, 10;w=1, 10;w=1` (an IETF-draft-style window list; `w=1` names a one-second
window). `health/request-rate.ts` is therefore a real probe, not a declared absence — see there for
the caveat about what a one-second window means read at a 60-second check interval.

### Icon sourcing

`assets/icon.svg` is **not** a favicon trace. `https://cdn.simpleicons.org/lokalise` 404s (no
simple-icons entry exists), and no SVG favicon or logo sits at `/favicon.svg`, `/logo.svg` or
similar paths on `lokalise.com`. The vendor's actual vector mark was found by reading the rendered
homepage HTML: `https://lokalise.com/uploads/Lokalise_logo_black_13918712fa.svg` is Lokalise's own
full lockup (icon + wordmark), served straight from their CMS uploads. The standalone icon — a
polygon and two rects forming a stylised chevron-and-bars mark — is the group of shapes that
precedes the wordmark's text glyphs in that same file; it was extracted verbatim (no redrawing, no
tracing) and re-framed onto the pack's shared `0 0 100 100` canvas by `_tools/icon-normalize.ts`,
which nests the original artwork in a child `<svg>` rather than transforming its path data. A test
in `tests/index.test.ts` pins a literal fragment of the vendor's own point list and its fill colour,
so a future redraw fails the suite.

## Auth

One method: `api-token`, type `apiKey`, header `X-Api-Token`.

Lokalise documents exactly one wire format for a plain API token — no query-string alternative to
accidentally reach for. Tokens come in two kinds, **read-only** and **read/write**, both stamped
identically; a read-only token calling a write action simply gets `403 Forbidden` from Lokalise
itself, which this app surfaces rather than trying to predict.

**`403` can also mean "not an admin on this project"** — Lokalise's own admonition: "you must have
an admin role in a project in order to access that project with the supplied API token." A token
can be perfectly valid account-wide and still be refused per-project.

### The probe is `GET /projects?limit=1`

There is no `/users/me` on this API — `GET /users/{user_id}` requires a `user_id` you do not have
until some other authenticated call has already told you one, and its own docs note it is "Not
available via OAuth token." `GET /projects` requires a credential, needs no project-specific admin
role, and returns nothing but the caller's own project metadata. `limit=1` keeps it cheap; an
account with zero projects still gets a valid `200` with an empty list, correctly reported `ok`.

### OAuth2 exists but is not implemented

Lokalise documents an OAuth2 flow, but registering an OAuth2 app requires **contacting Lokalise
support directly** (via their chat widget) to get a client id/secret issued — there is no
self-service application registry to automate against. Only the plain API token is implemented
here as a result.

## Actions

31 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
|---|---|---|
| `project-list` | search | `GET /projects` |
| `project-get` | read | `GET /projects/{project_id}` |
| `project-create` | perform | `POST /projects` |
| `project-update` | perform | `PUT /projects/{project_id}` |
| `project-delete` | perform | `DELETE /projects/{project_id}` |
| `key-list` | search | `GET /projects/{project_id}/keys` |
| `key-get` | read | `GET /projects/{project_id}/keys/{key_id}` |
| `key-create` | perform | `POST /projects/{project_id}/keys` |
| `key-update` | perform | `PUT /projects/{project_id}/keys/{key_id}` |
| `key-delete` | perform | `DELETE /projects/{project_id}/keys/{key_id}` |
| `language-list-system` | search | `GET /system/languages` |
| `language-list` | search | `GET /projects/{project_id}/languages` |
| `language-create` | perform | `POST /projects/{project_id}/languages` |
| `translation-list` | search | `GET /projects/{project_id}/translations` |
| `translation-get` | read | `GET /projects/{project_id}/translations/{translation_id}` |
| `translation-update` | perform | `PUT /projects/{project_id}/translations/{translation_id}` |
| `file-list` | search | `GET /projects/{project_id}/files` |
| `file-upload` | perform | `POST /projects/{project_id}/files/upload` |
| `file-download` | read | `POST /projects/{project_id}/files/download` |
| `file-delete` | perform | `DELETE /projects/{project_id}/files/{file_id}` |
| `process-get` | read | `GET /projects/{project_id}/processes/{process_id}` |
| `contributor-list` | search | `GET /projects/{project_id}/contributors` |
| `contributor-create` | perform | `POST /projects/{project_id}/contributors` |
| `comment-list` | search | `GET /projects/{project_id}/comments` |
| `comment-create` | perform | `POST /projects/{project_id}/keys/{key_id}/comments` |
| `task-list` | search | `GET /projects/{project_id}/tasks` |
| `task-create` | perform | `POST /projects/{project_id}/tasks` |
| `webhook-list` | search | `GET /projects/{project_id}/webhooks` |
| `webhook-create` | perform | `POST /projects/{project_id}/webhooks` |
| `webhook-delete` | perform | `DELETE /projects/{project_id}/webhooks/{webhook_id}` |
| `team-list` | search | `GET /teams` |

### Idempotency

**Nothing on this API carries a vendor-issued idempotency key** — every `perform` action's
declaration follows from the shape of the underlying call, not from a documented retry contract:

- **Not idempotent**: every bulk create (`key-create`, `language-create`, `contributor-create`,
  `comment-create`), `project-create`, `task-create`, `webhook-create` and `file-upload`. Nothing
  here dedupes a retry. `comment-create` is the sharpest case: there is no uniqueness constraint of
  any kind on comment text, so a retry does not just *risk* duplication — it guarantees it.
- **Idempotent**: every update (`project-update`, `key-update`, `translation-update` — full
  overwrites of the fields supplied) and every delete (`project-delete`, `key-delete`,
  `webhook-delete`, `file-delete` — the end state after one call and after five is the same thing
  gone; a repeat call answers `404`, surfaced as an error rather than swallowed).

### Notes on individual actions

- **`translation-update`'s `translation` field takes plain text OR a JSON object.** A plural key's
  translation is `{"one": "...", "other": "..."}`; a singular one is a plain string. The action
  accepts a `text` param and only attempts a JSON parse when the value looks like an object/array
  literal (`asTextOrJson` in `lib/client.ts`) — treating every string as JSON-or-error, the more
  obvious implementation, would reject "Hello world" as invalid JSON.
- **`file-download` does not fetch the bundle it creates.** The response is a signed S3 URL, valid
  roughly a month; fetching it would need `s3-*.amazonaws.com` in `network.allow`, which varies by
  AWS region and is not this app's to guess. The URL is returned for the next workflow step to use.
  As of June 1st 2025, Lokalise caps this endpoint to projects under 10,000 key-language pairs, with
  no larger paid tier for this specific limit.
- **`file-upload` is async.** The response is a `202` with a `process` object, not the imported
  keys — the import runs in the background. Poll `process-get` with the returned `process_id` until
  `status` is `finished` or `failed`.
- **`key-list`'s pagination ceiling is 500, not the 5,000 seen on Projects and Translations.**
  Lokalise varies the per-endpoint `limit` maximum rather than applying one API-wide number; each
  list action here states its own via `lib/params.ts`'s `paginationParams(default, max)`.
- **List endpoints support offset OR cursor pagination**, chosen by whether a `cursor` param is
  supplied. Offset pagination reports a total (`X-Total-Count`); cursor pagination is faster on
  large projects but reports `nextCursor` instead and never a total — Lokalise's own docs say cursor
  results arrive in creation order, not name order.
- **`webhook-list`/`webhook-create`'s result includes the webhook's signing `secret`.** Unlike
  Apify's `proxy.password` or Follow Up Boss's `/me`, this is a value the caller genuinely needs (to
  verify the `X-Secret` delivery header), so it is returned rather than stripped — but it is real
  secret material, and both actions' descriptions say so.
- **`key-create`/`language-create`/`contributor-create` are *effectively* closer to idempotent than
  their `false` declaration suggests**, because `key_name`/`lang_iso`/`email` uniqueness means a
  retry after a partial failure only completes the still-missing items — but there is no formal
  vendor guarantee to point to, so the honest declaration is `false`.
- **`task-create`'s `initial_tm_leverage` field is documented to arrive empty.** Lokalise calculates
  it asynchronously after creation; it is not part of this action's output.

## Health checks

Three declared checks plus the derived `auth:api-token`. All three are live probes — nothing here
is a declared absence, because every metered dimension this app looked for turned out to be
readable.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path check.** `https://status.lokalise.com/api/v2/summary.json` (1,785 bytes)
and `.../status.json` (216 bytes) both answer `200` with `application/json; charset=utf-8`.

**(b) Does the page describe *this* product?** Yes —
`"page": {"id": "v7htgzpzxwsh", "name": "Lokalise", "url": "https://status.lokalise.com"}`, with
five flat components (no groups, unlike some vendors in this pack): `Lokalise.com`, `Lokalise API`,
`Lokalise App`, `Lokalise OTA`, `Lokalise Messages`.

**(c) Is `status.lokalise.com` a decoy custom domain?** No —
`lokalise.statuspage.io/api/v2/summary.json` answers byte-identically, confirming it is that
Statuspage instance's own domain.

Severity is left at the `degraded` default: Lokalise is SaaS-only, so an incident here is evidence
about every Connection this app can hold.

### `quota` — plan headroom, per team

`GET /teams` returns, for every team the token can see, `quota_usage`/`quota_allowed` covering
users, keys (across all the team's projects), projects, OTA traffic bytes and AI words consumed.
`mau` (monthly active users) is in the same objects but documented `deprecated`, so it is read but
not reported. A token belonging to several teams has every team checked; the worst dimension across
all of them decides the verdict. Lokalise's own example response shows `quota_allowed.projects:
99999999` on an Essential-plan team — a ceiling so large it is functionally unlimited — so a
non-positive OR effectively-uncapped ceiling both read as "not exhausted" rather than the check
special-casing a magic constant that could change.

### `request-rate` — a live probe, because the remaining count is real

`x-ratelimit-remaining` is genuinely present and current on every response, unlike several vendors
in this pack that publish only a ceiling. This check reads it off a `GET /projects?limit=1` call —
the same one the credential probe makes — and reports low/zero headroom as `degraded`. A live `429`
during the check itself is treated as the signal, not a probe failure. The one caveat: the observed
window is **one second** (`w=1`), so a check running every `minIntervalSeconds` (60s) is reading
"were we being throttled at this instant," not a stable trend — see `health/request-rate.ts` for the
full reasoning on why that is still worth surfacing.

## Deliberately not covered

Lokalise's full API (both the branch-aware and non-branch variants) documents roughly 90 operations
in the non-branch spec alone. This app covers 31. What is left out, and why:

- **Branching** (`api-branching`, the separate `-with-branches` OpenAPI variant, and every
  branch-scoped path) — a Git-style workflow for a project's content, orthogonal to the read/write
  operations this app already covers on the trunk. A real feature, left for a follow-up rather than
  half-covered.
- **Snapshots** (`/projects/{id}/snapshots/**`) — point-in-time backups and restores. Operationally
  important but adjacent to the translate/manage path this app centers on.
- **Custom translation statuses** (`/projects/{id}/custom_translation_statuses/**`) — a
  project-level taxonomy feature that several actions here already accept ids for
  (`custom_translation_status_ids` in `file-upload`'s extra options) without needing its own CRUD
  surface in v1.
- **Segments** (`/projects/{id}/keys/{key_id}/segments/**`) — sub-key ICU plural/segment editing,
  a narrower surface than the key- and translation-level actions already here.
- **Glossary** (`/projects/{id}/glossary-terms/**`) — a real, useful feature; left out for scope in
  this first pass, not because anything about it could not be confirmed.
- **Translation memory** (`/projects/{id}/translation-memories`) — read-only listing of TM entries;
  adjacent to, but not part of, the create/translate/export path.
- **Orders** (`/teams/{id}/orders/**`) and **payment cards** (`/payment_cards/**`) — professional
  translation ordering and billing, a different concern from content management.
  `team.order.*` events are still selectable in `webhook-create`, so a workflow can react to one
  without this app managing the order lifecycle itself.
- **Team groups** (`/teams/{id}/groups/**`) and **team user management**
  (`/teams/{id}/users/**`, billing details) — account administration, not translation-workflow
  automation.
- **Permission templates** (`/teams/{id}/roles`) — read-only reference data for a feature
  (custom contributor roles) this app does not otherwise manage.
- **JWT tokens** (`POST /projects/{id}/tokens`) — mints a scoped token for Lokalise's own SDKs (iOS,
  Android, JS) to fetch OTA translations; a different consumer than a workflow step.
- **`GET /users/{user_id}`** — see Auth: it needs an id this app has no way to originate, and is
  "Not available via OAuth token" per its own description.
- **The `-with-branches` OpenAPI document's non-branch paths** — identical host and identical
  non-branch operations to the document this app was built against; reading both would have been
  redundant, not more thorough.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's own OpenAPI document or reference pages.

## Layout

```
lokalise/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # LokaliseClient, bulk/list response handling, error formatting
│   └── params.ts                # shared Param fragments (pagination, ids)
├── auth/api-token.ts            # apiKey (X-Api-Token): sign, test, afterConnect
├── actions/                     # one file per action (31)
├── health/
│   ├── service.ts               # status.lokalise.com
│   ├── quota.ts                 # per-team plan headroom, signed
│   └── request-rate.ts          # x-ratelimit-* headroom, signed
├── assets/icon.svg              # vendor mark, extracted + pack-normalized
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
