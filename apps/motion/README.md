# Motion

[Motion](https://www.usemotion.com) is an AI calendar and task manager: you give it work and it
decides when the work happens. This app covers the whole of Motion's public API — tasks, projects,
comments, recurring tasks, custom fields, and the workspaces, users, statuses and schedules that
everything else is addressed by.

- **API** — `https://api.usemotion.com`, `/v1` for most of it and **`/beta`** for custom fields
- **Auth** — an `X-API-Key` header. One mechanism; no OAuth, no scopes
- **Actions** — 27, one per documented endpoint
- **Health** — `service` (informational) · `api` · ~~`quota`~~ · 1 derived
- **Rate limit** — **12 requests/minute** on the individual tier; up to 120/minute for teams

Everything below was read off Motion's own reference at `docs.usemotion.com/api-reference/…` on
2026-08-11 and then confirmed against the live API the same day. Motion publishes no OpenAPI
document, so the surface here is its 31 documentation pages (27 endpoints plus four cookbooks),
read individually.

## The five things most likely to cost you a day

### 1. The documentation host answers HTTP 200 for every path that does not exist

`docs.usemotion.com` is a static Astro site with no 404. Every unknown path returns a byte-identical
**46,637-byte** shell:

| path                                | status | bytes  |
| ----------------------------------- | ------ | ------ |
| `/sitemap.xml`                      | 200    | 46,637 |
| `/llms.txt`                         | 200    | 46,637 |
| `/openapi.json`                     | 200    | 46,637 |
| `/api-reference/openapi.json`       | 200    | 46,637 |
| `/api-reference/tasks/get/` (real)  | 200    | 274,735 |
| `/api-reference/projects/get/` (real) | 200  | 134,116 |
| `/api-reference/comments/post/` (real) | 200 | 63,951 |

A reference page is identified by **size and content**, never by its status code. That signature is
also exactly what a missing OpenAPI document looks like, which is how a first pass at this vendor
concluded Motion was undocumented. The real pages are the 31 linked from the site index's sidebar,
which is server-rendered into that same shell — so the index is both the trap and the map.

None of the 31 contains `deprecat`, `sunset`, `will be removed` or `end of life`. The reference is
alive, not merely reachable.

### 2. `Content-Type` is validated before routing *and* before auth

A `POST` or `PATCH` without `content-type: application/json` is refused with:

```
HTTP/2 400
{"message":"Invalid Headers","error":"Content-Type must be application/json","statusCode":400}
```

and it is refused **before the router and before the auth guard**. Measured: `POST /v1/users/me`,
which is not a route at all, returns that 400 without the header and `404 Cannot POST /v1/users/me`
with it. So one missing header presents as "your request is malformed" on an endpoint that does not
exist, on an endpoint whose credential is wrong, and on a perfectly good call — three wrong places to
look. `lib/client.ts` sets the header whenever a body is present, including for an empty `{}` body,
and `tests/index.test.ts` asserts every POST/PATCH action passes a body.

There is a second edge to it. Motion's error body **swaps the roles of `message` and `error`**
between its two shapes:

| what emitted it        | `message`                  | `error`                                 |
| ---------------------- | -------------------------- | --------------------------------------- |
| the router (404)       | `Cannot GET /v1/x`         | `Not Found`                             |
| the header guard (400) | `Invalid Headers`          | `Content-Type must be application/json` |

Reading only one of the two fields silently drops half of every diagnosis. `formatMotionError`
reads both — a unit test caught it doing otherwise.

### 3. One 401 body for four different credential faults

All four of these returned the **same 43 bytes with the same `etag`**
(`W/"2b-dGnJzt6gv1nJjX6DJ9RztDWptng"`), measured against `GET /v1/users/me`:

| what was sent                              | status | body                                          |
| ------------------------------------------ | ------ | --------------------------------------------- |
| no header at all                           | 401    | `{"message":"Unauthorized","statusCode":401}` |
| `X-API-Key:` (empty value)                 | 401    | `{"message":"Unauthorized","statusCode":401}` |
| `X-API-Key: <plausible but wrong key>`     | 401    | `{"message":"Unauthorized","statusCode":401}` |
| `Authorization: Bearer <key>` (wrong name) | 401    | `{"message":"Unauthorized","statusCode":401}` |

The pack's rule is to classify a credential from the response *body* rather than the status code, and
here the body carries no discriminator either. So `Auth.test` names the possibilities instead of
asserting a cause: telling someone their key is invalid when the real fault was that the credential
never attached sends them to regenerate a perfectly good key.

### 4. The status page is real, and it says nothing about the API

`status.usemotion.com` is a genuine **Better Stack** page — and every path an integrator would try
first `301`s to `/`, which reads as "nothing published" behind a redirect-following client:

| path                                | status  | bytes   |
| ----------------------------------- | ------- | ------- |
| `/`                                 | 200     | 149,492 |
| `/api/v2/status.json`               | **301** | 0 → `/` |
| `/api/v2/summary.json`              | **301** | 0 → `/` |
| `/history.atom`                     | **301** | 0 → `/` |
| **`/index.json`**                   | 200     | 3,773   |
| `/feed.rss`                         | 200     | 629     |

`/index.json` names this product (`"company_name": "Motion"`,
`"custom_domain": "status.usemotion.com"`). But it carries exactly **one** component:

```json
{ "public_name": "Webapp", "status": "not_monitored" }
```

No component covers `api.usemotion.com`, and the one component it does have has no monitor attached
— so the page-level `"aggregate_state": "operational"` is a roll-up over nothing. See
[Health checks](#health-checks) for what that means for the check.

### 5. Two version prefixes on one host

Custom fields — the workspace definitions **and** the per-task/per-project values — live under
`/beta`. Everything else lives under `/v1`. There is no alias and no redirect:
`GET /v1/workspaces/{id}/custom-fields` is `404 Cannot GET …`, while
`GET /beta/workspaces/{id}/custom-fields` is `401 Unauthorized`. The prefix is part of each call
site's path, and `tests/index.test.ts` derives every request path from source and compares the set
to the 27 documented endpoints, so a `/v1` typo on a `/beta` route fails there rather than shipping.

## Two smaller ones

**`PATCH /v1/tasks/{id}` documents the full create body.** Motion's "Update task" page lists exactly
the "Create task" fields, including `name` and `workspaceId` marked **required**. So despite the
verb, this is not a sparse patch: an update restates the task. Both are required here, matching the
reference. Read the task first and pass its current `name` and `workspace.id` back unless you mean to
change them — `name` is also the rename field, so a wrong value is a silent rename rather than an
error.

**A recurring task's enums are narrower than a task's.** `POST /v1/recurring-tasks` accepts
`priority` of only `HIGH` or `MEDIUM` (no `ASAP`, no `LOW`) and `deadlineType` of only `HARD` or
`SOFT` (no `NONE`), where a one-off task takes the full sets. It also requires `assigneeId`, which a
one-off task does not. `lib/params.ts` keeps separate option lists for exactly this reason.

## Auth

One method, `api-key`, of type `apiKey`. Create the key in Motion under **Settings**; Motion shows it
**once**, so a partially-copied key is a common cause of the undiagnosable 401 above.

`sign` stamps `x-api-key` and nothing else. The key never enters a URL — Motion documents no query
form, and a workflow host logs request URLs while it does not log request headers. The header name is
sent lowercase because HTTP/2, which `api.usemotion.com` speaks, requires lowercase field names on
the wire.

### The probe is `GET /v1/users/me`

Chosen by reading the response schema, not the endpoint's name:

- **It requires a credential.** Unauthenticated it answers 401 (measured). That rules out the failure
  mode where a Connection whose key never attached sails through a probe against a public endpoint —
  ElevenLabs' `/v1/voices` and Apify's `/v2/store` are the cautionary cases.
- **It returns no credential material.** `{id, name, email}` and nothing else. Mailjet's `/apikey`,
  Follow Up Boss's `/me`, ElevenLabs' `/v1/user` and Podio's `/app/{id}` all hand back a live secret
  to a caller that already has one; Motion's whoami does not.
- **Nothing narrower exists and nothing wider is needed.** Motion publishes no scoped or restricted
  keys, so there is no permission a legitimate credential might lack here. The vendor's own
  getting-started page suggests `GET /v1/workspaces`; that is a paginated collection where this is one
  object, and it tells you nothing extra.

`afterConnect` publishes the account's **user id** and **name**. The user id is worth having: it is
what `assigneeId` takes on every task endpoint, and it appears nowhere in the Motion UI. The
response's third field, `email`, is deliberately dropped — Connection display data is rendered in
shared UI and copied into run records, and the name already makes a Connection readable.

A **429** from the probe reports "could not verify", not "bad credential". At 12 requests a minute a
throttle is reachable, and calling that a dead key would break a working Connection.

## Actions

27, one per documented endpoint. `tests/index.test.ts` derives the request each action builds from
its own source and asserts the set equals the 27 — so the coverage claim is measured, not asserted.

| Resource | Actions |
| --- | --- |
| task | `task-list` · `task-get` · `task-create` · `task-update` · `task-move` · `task-delete` · `task-unassign` |
| project | `project-list` · `project-get` · `project-create` |
| comment | `comment-list` · `comment-create` |
| recurring-task | `recurring-task-list` · `recurring-task-create` · `recurring-task-delete` |
| directory | `workspace-list` · `user-list` · `user-get-me` · `status-list` · `schedule-list` |
| custom-field (`/beta`) | `custom-field-list` · `custom-field-create` · `custom-field-delete` |
| custom-field-value (`/beta`) | `custom-field-value-set-task` · `custom-field-value-set-project` · `custom-field-value-delete-task` · `custom-field-value-delete-project` |

### Pagination

Cursor-only. Every paginated endpoint answers `{"meta": {"nextCursor"?, "pageSize"}, "<plural>": […]}`
and accepts exactly one paging parameter, `cursor`. There is **no** `limit`, `perPage` or `offset`
anywhere in the reference — the server picks the page size and reports it back. To walk a collection,
resend the identical query with `cursor` set to the previous `meta.nextCursor`, and stop when
`nextCursor` is absent. At 12 requests/minute that walk is the thing most likely to hit the rate
limit.

Every list action returns `{ items, meta }`; the vendor's own key (`tasks`, `projects`, `comments`,
`workspaces`, `users`) is normalised to `items` so the shape is the same everywhere. Note that
`GET /v1/recurring-tasks` names its collection **`tasks`**, not `recurringTasks` — reading the
obvious key returns an empty page forever without erroring.

Four endpoints answer a **bare JSON array** with no envelope and no cursor: `GET /v1/statuses`,
`GET /v1/schedules`, `GET /beta/workspaces/{id}/custom-fields`, and the two custom-field-value
writes' responses. The read actions wrap those as `{ items }` for uniformity.

### Idempotency

Motion documents **no idempotency key on any endpoint**, so nothing that creates is marked
idempotent: `task-create`, `project-create`, `comment-create`, `recurring-task-create` and
`custom-field-create` all duplicate their object on a retry — and a duplicated *recurring* definition
goes on generating tasks forever.

The ten that are marked idempotent leave the same end state after one call and after five:
`task-update` (a full restatement), `task-move`, the four deletes, `task-unassign`, and the two
set-value calls (a set, not an append).

### Three identifiers for one custom field

The easiest thing to get wrong in this API. The same field is addressed three different ways:

| you want to… | identifier | where it comes from |
| --- | --- | --- |
| read a value off a task/project | the field's **name** | keys of `customFieldValues` |
| write a value | the definition's **id** (`customFieldInstanceId`) | `custom-field-list` |
| clear a value | the **value's** id (`valueId`) | documented as distinct from both |

Motion's reference does not say which response carries the value id, so this app passes through
whatever the caller supplies rather than guessing a derivation.

### Notes on individual actions

- **`task-list`** — with no `workspaceId`, Motion returns tasks from *every workspace you belong to*.
  That is a much larger walk than it looks, and it is paid for in requests.
- **`task-delete` / `recurring-task-delete`** — the reference types their path parameter as
  `integer`, while the four other task endpoints type the same parameter as `string` and every id the
  API returns is an opaque string. It is a documentation slip; coercing to a number fails on every
  real id.
- **`task-create` / `task-update`** — `autoScheduled` is `object | null`, and the literal `null` is
  the **only** way to turn Motion's scheduler off for an existing task. Leaving the field empty means
  "do not touch it", which is a different instruction; `optionalJson` in `lib/client.ts` exists to
  keep those two apart.
- **`task-unassign`** — the only way to clear an assignee. `assigneeId` on the update call is a
  string and omitting it means "leave it alone", so there is no way to express "nobody" through an
  update.
- **`task-move`** — moving is a dedicated endpoint, even though the update body *also* carries a
  required `workspaceId`. That one restates where the task already lives; this one relocates it.
- **`recurring-task-create`** — `frequency` is Motion's own grammar, not cron:
  `daily_every_week_day`, `weekly_specific_days_[MO, WE, FR]`, `biweekly_first_week_any_day`,
  `monthly_first_MO`, `monthly_15`, `monthly_last_day_of_month`, `quarterly_first_week_day`, and so
  on. Day codes are `MO TU WE TH FR SA SU`, and the vendor's cookbook is explicit that a day array is
  never valid on its own. It is free text rather than a dropdown because the specific-days forms embed
  an arbitrary subset of seven day codes — over a hundred legal values before the monthly and
  quarterly arms are counted.
- **`project-create`** — `projectDefinitionId` (a template) makes `stages` required, and the stages
  must match the definition's **order and number**; Motion rejects a mismatch with a 400 that quotes
  the expected count. Motion publishes no endpoint for listing definitions, so the id comes from its
  UI and `stages` is free-form JSON.
- **Descriptions are Markdown on a task and HTML on a project.** The task reference says "Github
  Flavored Markdown"; the project reference says "HTML input accepted"; both are the vendor's own
  words for the same-named field. Motion's cookbook also records that GFM **checkboxes** (`- [ ]`) do
  not render, because the editor behind the field is ProseMirror, and gives a raw
  `<ul data-type="taskList">` block as the workaround. Comments go in as Markdown and come back as
  HTML.
- **`status-list`** — task `status` is set by **name**, not by id, so this is where a valid value
  comes from. `isDefaultStatus` and `isResolvedStatus` are per-workspace facts that are not guessable
  from a name.
- **`user-list` / `user-get-me`** — Motion assigns by user id, never by email address, and a user id
  appears nowhere in its UI. These are the only ways to get one.

## Health checks

| key | kind | severity | what it answers |
| --- | --- | --- | --- |
| `service` | service | **informational** | what Motion's status page says — which is only about `Webapp` |
| `api` | dependency | degraded (default) | is `api.usemotion.com` answering at all |
| ~~`quota`~~ | quota | informational | declared absence: Motion publishes no readable headroom |
| `auth:api-key` | credential | fatal (derived) | is this key live |

### `service` — a live probe that is barred from moving a verdict

The page is real and machine-readable, so this is a probe rather than a declared absence. It is
`informational` anyway, for two independent reasons:

1. **No component covers the API.** The page's only component is `Webapp`. Every action in this app
   talks to `api.usemotion.com`, a host the page does not describe.
2. **That component is `not_monitored`.** Better Stack has no monitor attached to it, so the
   page-level `aggregate_state: "operational"` is a roll-up over an empty set.

Reporting `ok` from that would present the absence of evidence as evidence, so when every component
is `not_monitored` the check returns **`unknown`** with a reason. `not_monitored` maps to `unknown`
rather than `ok` for the same reason; `maintenance` maps to `degraded` (planned work is not an outage,
but it is not business as usual either).

The check keeps producing better answers as Motion improves the page: attach a monitor, or add an API
component, and it starts giving signal with no code change here.

Two things it deliberately does not do. It does not read the `status_reports` entries — the array was
empty when this was measured, so an entry's shape is unverified, and it counts the relationship
rather than inventing an incident schema. And it does not use `/feed.rss`, which is a genuine RSS
document the spec's `feed:` declaration could parse for free: it is 629 bytes containing a channel
header and **zero `<item>` elements**, while `/index.json` carries the vendor's own state field.

`status.usemotion.com` is in the check's own `network.allow` and deliberately **not** in the app's —
no Action has business calling it. Redirects are not followed by the allowlist, which is a second
reason to name the exact path that answers rather than one that 301s.

### `api` — because nothing else covers the API

An unauthenticated `GET https://api.usemotion.com/v1/users/me`. **A 401 is the pass**: it proves DNS
resolved, TLS terminated, Cloudflare passed the request through, the router matched and the auth guard
ran. Judging by the status code would report Motion permanently down.

A **404** is the interesting failure. Motion's router answers before the auth guard for a path it does
not know (`GET /v1/definitely-not-real-zzz` → `404 Cannot GET …`), so a 404 here means the route the
credential probe depends on has been withdrawn — a different problem from an outage. A non-JSON body
means an edge error page or a captive portal, likewise `down`. A 429 is a **pass**: throttling proves
the API is answering.

`credential: "none"` matters here beyond the spec's requirement: at 12 requests/minute, a signed probe
would spend a meaningful fraction of the user's own budget monitoring it.

### ~~`quota`~~ — a declared absence, at `informational` severity

Motion exposes no remaining request count, verified two ways:

1. **Nothing on the wire.** Live responses carried `date`, `content-type`, `content-length`, `server`,
   `etag`, `cf-cache-status` and `cf-ray` — no `X-RateLimit-*`, no `Retry-After`. Twenty consecutive
   unauthenticated requests inside one minute produced twenty 401s and no 429, which places the
   limiter *after* the auth guard: it meters an API key, so an unsigned probe cannot read anyone's
   budget even indirectly.
2. **Nothing in the documentation.** The vendor's rate-limit page is 229 bytes of prose stating three
   fixed tier ceilings and nothing else.

The ceilings that do exist: **12 requests/minute** (individual), **up to 120/minute** (teams, on
request), higher on enterprise. `lib/client.ts` quotes the individual figure on a 429 so the number
arrives with the error.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict at
`unknown` forever.

## Deliberately not covered

- **The `status` filter on `GET /v1/tasks` and the `ids` filter on `GET /v1/workspaces.`** Both are
  documented as `array<string>`, and Motion's reference contains **no example request anywhere** — no
  curl block, no code sample, no OpenAPI document — so the wire encoding of a query array is
  unspecified. The plausible forms disagree on a NestJS/Express stack: `?status=A&status=B` parses to
  `["A","B"]` but `?status=A` parses to the string `"A"`, while `?status=A,B` parses to the single
  string `"A,B"`. A wrong guess does not error, it silently returns the wrong set of tasks — worse
  than not offering the filter. `includeAllStatuses` (a plain boolean, and documented as mutually
  exclusive with `status` anyway) is offered instead, and a workflow can filter the returned page on
  `status.name`. Body arrays are unaffected: `labels` and `stages` travel inside a JSON body, where an
  array has exactly one encoding.
- **Booleans are sent only when true.** Same reason: how Motion parses a *false* query value is
  unspecified, and a naive handler reads the non-empty string `"false"` as true. Off is the documented
  default for every boolean this app sends, so absence is exactly right.
- **Triggers.** Motion publishes no webhook or subscription endpoint in its reference. A polling
  trigger could be built on `task-list` plus `updatedTime`, but the spec's `TriggerDefinition` is not
  in scope for this app.
- **Updating a recurring task.** Motion publishes list, create and delete only — changing a frequency
  means delete and recreate.
- **Project definitions (templates).** `projectDefinitionId` is accepted by `project-create`, but
  Motion publishes no endpoint for listing definitions, so the id comes from its UI and this app
  cannot populate a picker.

## Icon

`assets/icon.svg` is `https://www.usemotion.com/favicon.svg` downloaded verbatim on 2026-08-11:
4,424 bytes, a 126×126 square, header `<!-- Generated by Pixelmator Pro 3.6.18 -->`. Nothing was
redrawn or reformatted — `deno task fmt` is scoped to the source directories and never touches
`assets/`. `tests/index.test.ts` asserts the byte length and the `viewBox`, so a reformat or a
substitution fails the suite.

## Layout

```
motion/
├── package.json              identity: io.w6w.motion, network.allow = [api.usemotion.com]
├── index.ts                  entry — 27 actions, 1 auth method, 3 health checks
├── lib/
│   ├── client.ts             MotionClient, the two version prefixes, error formatting
│   └── params.ts             shared Param fragments and the vendor's enums
├── auth/api-key.ts           X-API-Key: sign, test, afterConnect
├── actions/                  one file per documented endpoint
├── health/
│   ├── service.ts            Better Stack /index.json — informational
│   ├── api.ts                unsigned reachability probe of api.usemotion.com
│   └── quota.ts              declared absence
├── assets/icon.svg           vendor favicon, verbatim
└── tests/                    154 tests: entry module, client, auth, health, every action
```

## Development

Run from this directory (the devcontainer has no host `deno` — use the `api` service):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/motion && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```
