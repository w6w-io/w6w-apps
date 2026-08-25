# Streak

Manage Streak's CRM — pipelines, boxes (deals/records), stages, custom fields, contacts,
organizations and tasks — built directly on Gmail, over the **Streak API v1**.

- **Categories** — crm
- **Auth methods** — api-key (HTTP Basic, key as username, no password)
- **Actions** — 40
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.streak.com` (the `service` check adds `status.streak.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.streak.com/
- **API docs** — https://streak.readme.io/reference (ReadMe.io; backed by a real OpenAPI 3.1
  document embedded in the site's rendered pages, `info.title` `streak-v1` — there is no
  standalone `/openapi.json` export, so this app's spec was assembled by extracting that embedded
  document from several reference pages)
- **Status page** — https://status.streak.com/

> **Everything below was verified against Streak's own sources on 2026-08-25** — the OpenAPI
> document embedded in `streak.readme.io`'s reference pages, the `streak.readme.io/docs/*` guides,
> and live probes against `api.streak.com` and `status.streak.com`. Nothing here came from a
> third-party integration directory.

## The five things most likely to go wrong

### 1. Three "create" endpoints take a form body, not JSON

`PUT /pipelines` (create a pipeline), `PUT /pipelines/{key}/stages` (create a stage) and
`PUT /pipelines/{key}/fields` (create a field) are all declared `application/x-www-form-urlencoded`
in the vendor's own spec. Every other write in this API — including the sibling `POST` "update"
endpoints on the very same three resources — is `application/json`. Sending JSON to a create
endpoint is answered with a bare `400` and an empty body; nothing in the response says why.

[`lib/client.ts`](lib/client.ts)'s `StreakClient` exposes `sendJson()` and `putForm()` as two
separate methods rather than one that guesses, and only `pipeline-create`, `stage-create` and
`field-create` call `putForm()`.

### 2. List endpoints use four different envelopes, not one

| Shape | Endpoints |
| --- | --- |
| Bare array | `GET /pipelines`, `GET /pipelines/{key}/fields`, `GET /pipelines/{key}/boxes` |
| Object keyed by id | `GET /pipelines/{key}/stages` — `{"5001": {...}, "5002": {...}}`, not an array |
| `{"results": [...]}` | `GET /boxes/{key}/tasks`, `GET /users/me/teams` |
| `{"results": {"boxes": [...], "contacts": [...], "orgs": [...]}}` | `GET /search` |

Guessing the wrong one is a parse error, not a helpful one. Every `*-list` action in this app
normalises its own endpoint's shape into a plain `results` array (or, for `search`, into three
named arrays) so a caller never has to know which of the four it's talking to — `stage-list` in
particular takes the keyed-by-id object and returns `Object.values(...)`.

The `box-list` endpoint's own `page` parameter documents "if there are more results to show,
`hasNextPage` will be `true`" — but the response is a bare array with no such field anywhere in it,
and no sibling list endpoint carries one either. There is no documented way to detect the last page
except that it came back shorter than `limit` (or empty).

### 3. Two different shapes for "who's assigned," on two different endpoints

`box-create`'s `assignedToSharingEntries` is documented as "an array of objects with `email`
properties encoded as a JSON string" — literally `type: "string"` in the schema, with the vendor's
own example `[{"email":"ginny@weasley.com"}]` given as the *value of that string*: a JSON array,
itself JSON-encoded, embedded inside the outer JSON body. `box-update`'s field of the **same name**
is a plain, un-stringified array of user **keys**, not emails. `box-create.ts` and `box-update.ts`
each take a normal array as their own action's input and produce the correct wire shape internally
— [`lib/client.ts`](lib/client.ts)'s `toJsonString()` does the one-field re-encoding `box-create`
and `box-update`'s `fields` (also `format: "json"` on a `type: "string"` property) both need.

### 4. `create-a-task`'s body requires a field literally named `key`, meaning "box key"

`POST /boxes/{boxKey}/tasks` already carries the box key in the path — and its **required** JSON
body also requires a field named `key`, documented as "Box key." The same value, sent twice, under
two different names in two different places. The response's own `key` field means something
entirely different: the newly created *task's* key. `task-create.ts` hides the duplication —
callers of this app's `task-create` action supply `boxKey` exactly once.

### 5. Two different 401 bodies for two different auth failures — checked live

```
$ curl -s https://api.streak.com/api/v1/users/me
{"error":"Authentication required"}

$ curl -s -u badkey123: https://api.streak.com/api/v1/users/me
{"success": false, "error": "invalid api key"}
```

Both are HTTP 401. The first means the Authorization header never reached the request; the second
means it did and Streak rejected the key. `auth/api-key.ts`'s `test` hook distinguishes them by body
shape (the presence of `success`) rather than collapsing both into one generic "unauthorized."

## Auth

One method: `api-key`, type `basic`.

Streak's own authentication guide: "Streak uses HTTP Basic Auth to sign each request with your API
key. Simply set the username of the request to the API key. We do not require a password." The
guide's own sample line is `curl https://api.streak.com/api/v1/pipelines -u YOUR_API_KEY:` — the
trailing colon and nothing after it. This app types `basic` rather than `apiKey` because that is
literally what the vendor implements. Streak publishes no OAuth surface for third-party apps and no
scoped-token mechanism (contrast Apify) — "your API key has all of the same privileges that you have
while accessing Streak," so there is no narrower-credential concern to design around.

### The probe is `GET /users/me`

Chosen because it requires a credential (`401 {"error":"Authentication required"}` unauthenticated,
measured live) and its documented response body — `email`, `lowercaseEmail`, three timestamps,
`isOauthComplete`, `userKey`, `displayName`, `key` (the user's own key, not the API key) — carries no
credential material, unlike Follow Up Boss's `/me` or Mailjet's `/apikey`. `afterConnect` reuses the
same call and keeps only `email` as the connection label.

## Actions

40 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `user-get-current` | read | `GET /users/me` |
| `user-get` | read | `GET /users/{userKey}` |
| `team-list` | search | `GET /users/me/teams` |
| `team-get` | read | `GET /teams/{teamKey}` |
| `pipeline-list` | search | `GET /pipelines` |
| `pipeline-get` | read | `GET /pipelines/{pipelineKey}` |
| `pipeline-create` | perform | `PUT /pipelines` (form) |
| `pipeline-update` | perform | `POST /pipelines/{pipelineKey}` |
| `pipeline-delete` | perform | `DELETE /pipelines/{pipelineKey}` |
| `stage-list` | search | `GET /pipelines/{pipelineKey}/stages` |
| `stage-get` | read | `GET /pipelines/{pipelineKey}/stages/{stageKey}` |
| `stage-create` | perform | `PUT /pipelines/{pipelineKey}/stages` (form) |
| `stage-update` | perform | `POST /pipelines/{pipelineKey}/stages/{stageKey}` |
| `stage-delete` | perform | `DELETE /pipelines/{pipelineKey}/stages/{stageKey}` |
| `field-list` | search | `GET /pipelines/{pipelineKey}/fields` |
| `field-get` | read | `GET /pipelines/{pipelineKey}/fields/{fieldKey}` |
| `field-create` | perform | `PUT /pipelines/{pipelineKey}/fields` (form) |
| `field-update` | perform | `POST /pipelines/{pipelineKey}/fields/{fieldKey}` |
| `field-delete` | perform | `DELETE /pipelines/{pipelineKey}/fields/{fieldKey}` |
| `box-list` | search | `GET /pipelines/{pipelineKey}/boxes` |
| `box-get` | read | `GET /boxes/{boxKey}` |
| `box-create` | perform | `POST /pipelines/{pipelineKey}/boxes` |
| `box-update` | perform | `POST /boxes/{boxKey}` |
| `box-delete` | perform | `DELETE /boxes/{boxKey}` |
| `box-field-value-get` | read | `GET /boxes/{boxKey}/fields/{fieldKey}` |
| `box-field-value-update` | perform | `POST /boxes/{boxKey}/fields/{fieldKey}` |
| `contact-get` | read | `GET /contacts/{contactKey}` |
| `contact-create` | perform | `POST /teams/{teamKey}/contacts/` |
| `contact-update` | perform | `POST /contacts/{contactKey}` |
| `contact-delete` | perform | `DELETE /contacts/{contactKey}` |
| `organization-get` | read | `GET /organizations/{organizationKey}` |
| `organization-update` | perform | `POST /organizations/{organizationKey}` |
| `organization-delete` | perform | `DELETE /organizations/{organizationKey}` |
| `task-list` | search | `GET /boxes/{boxKey}/tasks` |
| `task-get` | read | `GET /tasks/{taskKey}` |
| `task-create` | perform | `POST /boxes/{boxKey}/tasks` |
| `task-update` | perform | `POST /tasks/{taskKey}` |
| `task-delete` | perform | `DELETE /tasks/{taskKey}` |
| `search` | search | `GET /search?query=` |
| `box-search-by-name` | search | `GET /search?name=` |

### Idempotency

The six creates (`pipeline-create`, `stage-create`, `field-create`, `box-create`, `contact-create`,
`task-create`) are `idempotent: false` — Streak documents no idempotency-key mechanism for any of
them, so a retry makes a second, separately identified resource. Every update and delete is
`idempotent: true`: each reaches the same end state no matter how many times it runs.

### Notes on individual actions

- **`pipeline-create`'s form fields for seeding initial stages/fields are comma-separated strings**
  (`fieldNames`, `fieldTypes`, `stageNames`) — consistent with the endpoint's form-urlencoded body,
  not a JSON array.
- **`field-create`'s type options exclude `PERSON`.** The vendor's own docs list the creatable types
  as `TEXT_INPUT`, `DATE`, `TAG`, `FORMULA`, `DROPDOWN`, `CHECKBOX` and `TEAM_CONTACT`. `PERSON`
  appears only on Streak's own built-in fields (e.g. "Assigned To") and is never documented as
  something a caller can create.
- **`organization-update`'s `domains`, `phoneNumbers` and `addresses` are sent as plain strings**,
  exactly as the vendor's schema documents them — even though `GET /organizations/{key}` reads all
  three back as JSON arrays. Unlike the box fields above, there is no `format: "json"` marker and no
  encoding example anywhere in the spec for these three, so this app does not guess an array
  encoding the vendor never states. Verify the result with `organization-get` after writing one of
  these.
- **There is no `organization-create`.** The closest endpoint, `POST /teams/{teamKey}/organizations`
  ("check for existing organizations"), is a lookup-by-domain, not a create — Streak's own model is
  that organizations are derived from contacts/boxes rather than authored directly. Left out rather
  than mis-modeled as a create.
- **`search` vs `box-search-by-name`** are two distinct endpoints, not one call with an optional
  field. `search` (`?query=`) returns `results.boxes`/`results.contacts`/`results.orgs`;
  `box-search-by-name` (`?name=`) returns only `results.boxes`, whose entries additionally carry
  `assignedToKeys`. The vendor's own operation id for the name search is the typo'd
  `searchng-for-boxes-by-name` — kept only as a note here, not reflected in this app's action key.
- **The `query`/`name` search parameters are documented `in: "path"`** on paths literally spelled
  `/search?query={query}` and `/search?name={name}` — a ReadMe.io rendering quirk, not a real path
  template. Both actions send them as ordinary query-string parameters, matching the vendor's own
  `curl` examples.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json` answers 200 with 1,778
bytes of JSON; a nonsense path answers a genuine 404 with an empty body. An unclaimed
`*.statuspage.io` page answers every path with the same ~127,700-byte HTML shell — this is neither
that shape nor that size.

**(b) Does the page describe Streak?** Yes — `{"page": {"id": "7kv7scdrc87y", "name": "Streak",
"url": "https://status.streak.com"}}`, with five components: `streak.com`, **`Streak API`**, and the
three client apps (`Streak for Gmail (desktop)`, `Streak for Android`, `Streak for iOS`).

**(c) Does it name the surface this app actually calls?** Yes, exactly — there is a component
literally named `Streak API`, unlike Twitch (six components, none Helix) or Datadog (38 product
tiles, nothing matching "api"). No disambiguation is needed.

The check's `state` tracks the `Streak API` component's own status specifically, not the page-level
`status.indicator` (which rolls up all five) — a client-app-only outage (e.g. Streak for iOS) must
not fail this app's verdict, and an API outage must not be masked by three healthy clients. The other
four components are still reported in the check's `message`/`components`, at no worse than
`degraded`. If the vendor ever renames or drops the `Streak API` component, the check reports
`unknown` rather than silently reporting on the wrong one. Severity is left at the `degraded` default
— Streak is SaaS-only, so every Connection runs on exactly the infrastructure this page describes.

### ~~`quota`~~ — a declared absence, at `informational` severity

Streak publishes no rate-limit or quota surface anywhere this app could find: no dedicated
rate-limiting doc page (`/docs/rate-limiting` 404s), no mention of a request ceiling, throttling
window or `429` in the authentication/overview/getting-started guides, and no rate-limit-shaped
response header in any of the reference examples for the 40 operations this app implements.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, which
outranks `ok` in the roll-up, so any other severity would pin this app's verdict at `unknown`
forever.

## Deliberately not covered

Streak's reference documents roughly 95 operations across the areas this app draws from. This app
covers 40 — the pipeline/box/stage/field/contact/organization/task lifecycle a workflow actually
drives. Left out, and why:

- **Files** (`/files/**`, `/boxes/{key}/files`) — file metadata and Drive-linked attachments. Reading
  file *contents* (`GET /files/{key}/contents`) returns whatever binary/text the file is, with no
  single JSON projection this app's `read` shape can commit to.
- **Threads & email** (`/boxes/{key}/threads`, `/threads/{key}`, `PUT /boxes/{key}/threads`) — Gmail
  thread metadata and "put an email in a box." This app's centre of gravity is CRM records, not
  reading/writing Gmail content through Streak.
- **Meetings** (`/boxes/{key}/meetings`, `/meetings/{key}`) — calendar-derived records with no
  documented create endpoint (only get/update/delete), which made them a poor fit for the
  read/write/delete symmetry the rest of this app keeps.
- **Snippets** (`/snippets/**`) — canned email replies, a Gmail-composer feature rather than a CRM
  record.
- **Newsfeed** (`/newsfeed`, `/pipelines/{key}/newsfeed`, `/boxes/{key}/newsfeed`, the newsfeed
  export) — an activity-log read with a `detailLevel` param this app could not verify the enum values
  of from the available reference pages.
- **Saved views & groups** (`/pipelines/{key}/views/**`) — Streak Studio-configured board views;
  reading through a *view* rather than the pipeline's boxes directly adds a layer this app's
  `box-list` already covers more directly.
- **Batch box move** (`POST /pipelines/{key}/boxes/batch`) — takes a `json`-typed body documented
  only as a single opaque `json` string field with no example of its contents; left out rather than
  guessed.
- **Contact/organization custom field CRUD** (`/teams/{key}/contacts/fields/**`,
  `/teams/{key}/organizations/fields/**`) — a second, team-scoped custom-field system distinct from
  the per-pipeline fields this app already covers (`field-*`). Real, but out of scope for this pass.
- **Timeline** (`GET /boxes/{key}/timeline`) — a paginated activity feed with `filters` and
  `direction` params this app could not fully verify the enum values of.
- **Webhooks** (`/webhooks/**`) — event subscriptions. This app models the request/response CRUD
  surface, not inbound triggers; adding a Streak trigger is future work, not a gap in this pass.

Nothing was left out because it could not be confirmed to exist — every endpoint above is documented
in the vendor's own reference. Nothing was guessed: where a field's wire encoding could not be
confirmed (`organization-update`'s `domains`/`phoneNumbers`/`addresses`), this app sends exactly the
documented type and says so rather than inventing one.

## Icon

`assets/icon.png` is Streak's own mark, downloaded **verbatim** from Streak's marketing site's
Webflow CDN
(`https://cdn.prod.website-files.com/6744e71b115ff83278f43fd3/6a81fb5d26090f8046a42b83_streak-logo-favicon-512.png`,
found linked as the page's own `<link rel="icon">` on 2026-08-25) — 192×192 RGBA PNG, 32,578 bytes.
Streak publishes no SVG mark at `favicon.svg`, `apple-touch-icon.png` or any other checked path (all
404), so this app uses a PNG per this pack's existing precedent (e.g. `apify`, `amplitude`,
`greenhouse`) rather than inventing a vector redraw. Declared via `w6w.appearance.icon.url`, not
`.svg`.

## Layout

```
streak/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # StreakClient: get/sendJson/putForm/del, error formatting, json helpers
│   └── params.ts                # shared Param fragments and the vendor's field-type enum
├── auth/api-key.ts              # HTTP Basic (key as username): sign, test, afterConnect
├── actions/                     # one file per action (40)
├── health/
│   ├── service.ts                # status.streak.com, weighted on the 'Streak API' component
│   └── quota.ts                  # declared absence, informational
├── assets/icon.png               # vendor mark, verbatim
└── tests/                        # entry module, every action, auth, health, lib
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
