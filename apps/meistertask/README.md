# MeisterTask

Manage MeisterTask projects, sections, tasks, subtasks, checklists, labels and comments over the
**MeisterTask REST API** (`https://www.meistertask.com/api`).

- **Categories** — project-management, productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 38
- **Health checks** — 1 live (`service`) + 1 declared absence (~~`rate-limit`~~) + 2 derived
  (`auth:personal-access-token`, `auth:oauth2`)
- **Egress allowlist** — `www.meistertask.com` (the `service` check adds `status.meistertask.com`
  to its own hook allowlist, never to the app's; OAuth endpoint hosts on `www.mindmeister.com`
  are allowed implicitly by the runtime)
- **Website** — https://www.meistertask.com/
- **API docs** — https://developers.meistertask.com/reference/authentication
- **Status page** — https://status.meistertask.com/

MeisterTask is the Kanban-style project and task manager from the Meister suite, alongside
MindMeister (mind mapping) — the two share an account and OAuth backend, which shapes this app's
auth methods more than its actions.

> **Everything below was verified against MeisterTask's own sources on 2026-09-05** — its OpenAPI
> 3.1 document (there is no separately hosted `openapi.json`; it is embedded
> server-side-rendered in every `developers.meistertask.com/reference/*` page, inside that page's
> `ssr-props` script, under `document.api.schema`), the resource "Overview" prose pages linked
> from the same sidebar, and live probes against `www.meistertask.com` and
> `status.meistertask.com`. Nothing here came from a third-party integration directory or from
> memory.

## The three things most likely to cost someone a day

### 1. Two error envelopes coexist, and the docs only show one

The vendor's [error-handling reference page](https://developers.meistertask.com/reference/error-handling)
documents exactly one shape:

```json
{ "errors": [{ "message": "Access to project with ID 123 forbidden", "status": 403 }] }
```

That is genuinely what every `400`/`403`/`404` answers — checked against several resources. **A
`401` is different, and the docs never show one.** Live probes against `GET /persons/me` on
2026-09-05 — no token, and a syntactically-plausible bogus token — both answered:

```json
{ "error": { "code": 401, "message": "Invalid credentials" } }
```

A *singular* `error` object, not the documented plural array. This isn't an isolated quirk: it is
the same shape the OpenAPI document's own Attachment-resource examples use (the *only* place a
`401` example appears anywhere in the spec), which means the singular form is the API's actual
authentication-layer error shape — MindMeister's shared auth backend answers differently than
MeisterTask's own resource controllers do once a request is authenticated. `formatMeisterTaskError`
in [`lib/client.ts`](lib/client.ts) parses both shapes; a client written against the docs alone
would throw on `JSON.parse` reaching for `.errors[0]` on a `401` and finding `undefined`.

### 2. One create endpoint is misfiled in the vendor's own OpenAPI spec

Creating a checklist item is documented under the **literal path string**
`/checklists/:checklist_id/checklist_items` (colon syntax, not the `{checklist_id}` template every
sibling operation uses) and declares its only path parameter as **`task_id`** — which the
operation's own summary, description and response example all contradict; they are consistently
about a *checklist*, not a task. The vendor's own schema-upload validation log records exactly this
mismatch as a warning ("has a path parameter named `task_id`, but there is no corresponding
`{task_id}` in the path string"). `actions/checklist-item-create.ts` calls the conventional REST
form instead, `POST /checklists/{checklist_id}/checklist_items`, matching its `GET` sibling
(`checklist-item-list`) and the response shape the spec actually documents. Following the
documented path parameter literally would either 404 or silently target the wrong resource.

### 3. A checklist item's status enum isn't where you'd look for it

The `PUT`/`POST` operation schemas for a checklist item say only "The status of the
checklist-item", `type: Number` — no enum, no hint. The real values, **`1` (actionable)** and
**`5` (completed)** — not `1`/`2` the way a task's or a section's status enum reads — only appear in
the separate Checklist-Item **"Overview"** page's model table, one click away from every operation
that actually needs them. `actions/checklist-item-create.ts` and
`actions/checklist-item-update.ts` use the correct values; guessing `1`/`2` by analogy with the
sibling resources would silently fail to mark anything completed.

## Auth

Two methods, mirroring the vendor's own two documented paths — MeisterTask shares MindMeister's
account and OAuth backend (its own authentication page states this explicitly and links to
MindMeister's docs for both flows):

| Method | Type | Use when |
| --- | --- | --- |
| `personal-access-token` | `bearer` | A single account automating its own work — no app registration needed. |
| `oauth2` | `oauth2` | A public integration serving many end users, via a browser consent flow. |

Both sign the same way (`Authorization: Bearer <token>`) and probe the same endpoint,
**`GET /persons/me`** — chosen because it requires a credential (a `401` with no token, or a
`401` with a bogus one, are both confirmed live) and returns only the caller's own profile
(name, email, avatar, timestamps) — no secret, nothing a health check would leak by running it.

OAuth endpoints are MindMeister's, not MeisterTask's own:

- Authorization: `https://www.mindmeister.com/oauth2/authorize`
- Token: `https://www.mindmeister.com/oauth2/token`
- Scopes: `userinfo.profile`, `userinfo.email`, `meistertask` — all three required per MeisterTask's
  own docs.

A personal access token is created at `mindmeister.com/api` (not anywhere under `meistertask.com`)
and, per the vendor's docs, does not expire by time — only by manual revocation. No `refresh` hook
is declared for the OAuth method: the vendor's own token-response schema states `expires_in` is
*optional*, and this app has not verified a `refresh_token` is actually issued when it's present.

## Actions

38 actions across nine resources. `resource` groups them in the editor.

| Resource | Key | Type | Endpoint |
| --- | --- | --- | --- |
| project | `project-list` | search | `GET /projects` |
| project | `project-create` | perform | `POST /projects` |
| project | `project-get` | read | `GET /projects/:id` |
| project | `project-update` | perform | `PUT /projects/:id` |
| project | `project-duplicate` | perform | `POST /projects/:id/duplicate` |
| project | `project-members-list` | search | `GET /projects/:id/members` |
| section | `section-list` | search | `GET /projects/:project_id/sections` |
| section | `section-create` | perform | `POST /projects/:project_id/sections` |
| section | `section-get` | read | `GET /sections/:id` |
| section | `section-update` | perform | `PUT /sections/:id` |
| task | `task-list` | search | `GET /projects/:project_id/tasks` |
| task | `task-create` | perform | `POST /sections/:section_id/tasks` |
| task | `task-get` | read | `GET /tasks/:id` |
| task | `task-update` | perform | `PUT /tasks/:id` |
| task | `subtask-create` | perform | `POST /tasks/:task_id/subtasks` |
| task | `subtask-list` | search | `GET /tasks/:task_id/subtasks` |
| checklist | `checklist-list` | search | `GET /tasks/:task_id/checklists` |
| checklist | `checklist-create` | perform | `POST /tasks/:task_id/checklists` |
| checklist | `checklist-update` | perform | `PUT /checklists/:id` |
| checklist | `checklist-delete` | perform | `DELETE /checklists/:id` |
| checklist-item | `checklist-item-list` | search | `GET /checklists/:checklist_id/checklist_items` |
| checklist-item | `checklist-item-create` | perform | `POST /checklists/:checklist_id/checklist_items` (see finding #2) |
| checklist-item | `checklist-item-update` | perform | `PUT /checklist_items/:id` |
| checklist-item | `checklist-item-delete` | perform | `DELETE /checklist_items/:id` |
| label | `label-list` | search | `GET /projects/:project_id/labels` |
| label | `label-create` | perform | `POST /projects/:project_id/labels` |
| label | `label-update` | perform | `PUT /labels/:id` |
| label | `label-delete` | perform | `DELETE /labels/:id` |
| task-label | `task-label-list` | search | `GET /tasks/:task_id/task_labels` |
| task-label | `task-label-add` | perform | `POST /tasks/:task_id/task_labels` |
| task-label | `task-label-remove` | perform | `DELETE /task_labels/:id` |
| comment | `comment-list` | search | `GET /tasks/:task_id/comments` |
| comment | `comment-create` | perform | `POST /tasks/:task_id/comments` |
| comment | `comment-delete` | perform | `DELETE /comments/:id` |
| person | `person-list` | search | `GET /persons` |
| person | `person-get` | read | `GET /persons/:id` |
| person | `person-me` | read | `GET /persons/me` |
| person | `project-person-list` | search | `GET /projects/:project_id/persons` |

### Notes on individual actions

- **No response envelope, and countless pagination.** Every response is the bare resource — a JSON
  object or array — never wrapped the way Asana or Apify wrap theirs. A search action's `output`
  therefore uses the pack's empty-key convention (`{ key: "", type: "array" }`) to mean "the whole
  result is this array" rather than naming a field that doesn't exist. Pagination is `items`
  (default 50, max 500) + `page` (1-based); the vendor's own name for it is "countless pagination"
  — **no response carries a total count**, in the body or in a header, only `Link`/`Current-Page`/
  `Page-Items`. Walking to completion means paging until an empty page comes back.
- **`task-label-list` returns the join rows, not the labels.** `GET /tasks/:task_id/labels` (which
  this app does not implement) returns the label objects themselves; `task-label-list`
  (`GET /tasks/:task_id/task_labels`) returns the *join record* between a task and a label — the
  only place the id `task-label-remove` needs actually lives.
- **`task-create` and `subtask-create` leave out `custom_fields` and nested `checklists`.** Both
  are documented on the create body only in prose — no schema for the child object shape — so they
  are left out rather than guessed at; attach labels via `task-label-add` and checklists via
  `checklist-create` after the task exists instead. `label_ids` *is* exposed, since it's a plain
  array of numbers with no ambiguity.
- **`project-duplicate`'s five `include_*` flags are documented as `type: string` with no enum**,
  each described as "if set to `true` the X will be duplicated" — the same true/false-as-a-string
  convention the vendor uses nowhere else in this surface that this app found. Exposed here as
  booleans and serialized to the literal string the schema declares.
- **`project-members-list`'s own documented example isn't valid JSON.** It uses Ruby's `=>`
  hash-rocket syntax (`"id"=>5859`) instead of `:`. The field names are trustworthy — this is
  clearly a copy-paste from a Ruby console, not a different response shape — but `output` is left
  as a single opaque object rather than a machine-checked schema for that reason.
- **A task's `assigned_to_id` is typed inconsistently across its own two operations** — `string`
  on the `POST` (task-create) body, `integer` on the `PUT` (task-update) body, for what is the same
  field on the same resource. Both are sent as a JSON number here; a Rails backend accepts either
  representation for an integer column, and this was not observed to matter in practice.

## Health checks

One live probe, one declared absence, plus the two derived `auth:*` checks.

### `service` — a real status page, on a platform this pack hasn't seen before

`status.meistertask.com` is built on **Sorry** (`sorryapp.com`), not Atlassian Statuspage or
Instatus like most vendors in this pack — visible in the page's own
`<meta name="generator" content="Sorry™ (https://www.sorryapp.com)" />`. The
Statuspage/Instatus-shaped paths every other check in this pack tries first
(`/api/v2/summary.json`, `/api/status`, `/status.json`) all **404 as the same 35KB SPA shell** —
easy to mistake for "no machine-readable feed" if you stop there. The real API lives at the
Sorry-specific path instead:

| Path | Status | Bytes | Content-Type |
| --- | --- | --- | --- |
| `/api/v1/status` | 200 | 345 | `application/json` |
| `/api/v2/summary.json` | 404 | 35,450 | `text/html` (SPA shell) |
| `/status.json` | 404 | 35,442 | `text/html` (SPA shell) |

`{"page": {"id": 2543, "name": "MeisterTask", "url": "https://status.meistertask.com"}}` — genuinely
claimed, not a decoy — and `/api/v1/components` names four real components including a genuine
`API` one (id `1791`), distinct from `Web Application` (the browser app this API-only integration
never touches).

**Sorry's state vocabulary is not publicly documented anywhere this app could find** — unlike
Atlassian Statuspage's well-known enum. Every component observed live on 2026-09-05 read
`"operational"`, so that is the only value `mapSorryState` maps with confidence, to `ok`; anything
else maps to `degraded` rather than a guessed `down` (see `health/service.ts`).

The check reports the **worse** of the page-level roll-up and the `API` component specifically —
a healthy page while `API` itself lags would otherwise read as fully healthy, since the page-level
indicator only reflects what MeisterTask's own roll-up chooses to weight.

Severity is left at the `degraded` default: MeisterTask is SaaS-only, so an incident here really is
evidence about every Connection.

### ~~`rate-limit`~~ — a declared absence, at `informational` severity

The vendor's own [rate-limiting page](https://developers.meistertask.com/reference/rate-limiting)
states a hard ceiling — **120 requests per 60 seconds**, with a `429` that **blocks the client for
180 seconds** rather than just failing the one request — but publishes no header of any kind
carrying a remaining count or reset time. Checked live against `GET /persons/me` and `GET /projects`
on 2026-09-05 (both signed and unsigned): no `X-RateLimit-*`, `RateLimit-*`, or any vendor-prefixed
header was present on a `200` or a `401`. There is nothing to read in advance.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity this would pin the App's overall
verdict at `unknown` forever.

## Deliberately not covered

MeisterTask's sidebar lists eighteen resources; this app covers nine. What's left out, and why:

- **Attachment** — file upload/download is a different I/O shape (binary content, not JSON) than
  every other resource here, and is also the one resource whose OpenAPI examples show the singular
  `{"error": {...}}` envelope (see finding #1) — worth a dedicated pass rather than folding in.
- **Custom Fields / Custom Field Types / Dropdown Items** — a three-resource hierarchy
  (project-level type definitions → per-type dropdown options → per-task values) whose value shape
  on a task depends on the field's own type; modeling it faithfully is more than this pass's scope.
- **Project Image** — avatar upload, same binary-content reasoning as Attachment.
- **Project Right / Project Memberships / Project Setting / Group** — the Business-plan
  permissions and grouping model. `project-members-list` already surfaces the read side (which
  rights/memberships exist); writing them is a distinct, higher-stakes surface (who can access a
  project) better scoped on its own.
- **Task Relationship / Task Subscription** — task-to-task links and per-person watch state;
  genuinely useful, omitted only for scope.
- **Timeline Item** — a task's activity-log entries; read-only history, not something a workflow
  typically drives.
- **Work Interval** — time tracking. `task-get`'s `tracked_time` field already surfaces the
  aggregate; per-interval CRUD is a distinct scope.

Nothing was left out because it could not be confirmed — every endpoint above is present in the
vendor's own OpenAPI document and was read there.

## Icon

`assets/icon.svg` is MeisterTask's own mark, downloaded **verbatim** from
`https://www.meistertask.com/pages/favicon/favicon.svg` on 2026-09-05 — 1,456 bytes, `image/svg+xml`,
a rounded hexagon (`#1891FF`) with a white checkmark-style glyph — the full-color mark, not a
monochrome favicon. It is not formatted by `deno task fmt`, whose file list names only the `.ts`
directories.

## Layout

```
meistertask/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # MeisterTaskClient, error-envelope parsing, both error shapes
│   └── params.ts                # shared Param fragments (pagination, sort, label palette)
├── auth/
│   ├── personal-access-token.ts # bearer: sign, test, afterConnect
│   └── oauth2.ts                # oauth2 via MindMeister's authorization server
├── actions/                     # one file per action (38)
├── health/
│   ├── service.ts                # status.meistertask.com (Sorry-hosted)
│   └── rate-limit.ts             # declared absence, informational
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # entry module, every action, both auth methods, health, lib
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

`deno task validate` passes `--config ./deno.json` explicitly — without it, `_tools/audit.ts` picks
up `_tools/deno.json` as its configuration and cannot resolve the `@w6w/types` value imports this
app's health check needs (`worstHealthState`).
