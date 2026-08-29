# CloudConvert

Convert, compress and manipulate files through CloudConvert's job/task pipeline, on the
**CloudConvert API v2**.

- **Categories** — documents, developer-tools
- **Auth methods** — api-token
- **Actions** — 18
- **Health checks** — 3 (`service`, `quota`, ~~`request-rate`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.cloudconvert.com`, `sync.api.cloudconvert.com` (the `service` check
  adds `status.cloudconvert.com` to its own hook allowlist, never to the app's)
- **Website** — https://cloudconvert.com/
- **API docs** — https://cloudconvert.com/docs/getting-started/introduction
- **Status page** — https://status.cloudconvert.com/

CloudConvert processes files via **jobs**, each made of one or more **tasks** — typically an
import task, a conversion task, and an export task, wired together by task name. So the shape of
almost every use of this API is the same three beats — import, convert, export — and this app's
centre of gravity, `convert-url`, does exactly that in a single call.

> **Everything below was verified against CloudConvert's own sources on 2026-08-29** — its
> documentation pages (`cloudconvert.com/docs/getting-started/introduction`,
> `.../api-reference/jobs`, `.../api-reference/tasks`, `.../api-reference/users`,
> `.../api-reference/webhooks`, `.../api-reference/operations`, `.../import-export/import-files`,
> `.../import-export/export-files`, `.../operations/convert-files`) and live probes against
> `api.cloudconvert.com`, `sync.api.cloudconvert.com` and `status.cloudconvert.com`. Nothing here
> came from a third-party integration directory. CloudConvert does not publish a machine-readable
> OpenAPI document (its own reference site is hand-written, unlike Apify's), so every field name,
> enum and status code below was read from the rendered docs and cross-checked with a live probe.

## The five things most likely to go wrong

### 1. Two hosts, same paths, a different contract

CloudConvert serves the **identical** `/v2` paths on two hosts:

| Host | Behaviour |
| --- | --- |
| `api.cloudconvert.com` (default) | **Asynchronous.** `POST /v2/jobs` returns immediately with the job in `processing` status. |
| `sync.api.cloudconvert.com` | **Synchronous.** The same paths block until the job/task reaches a terminal state (`finished` or `error`). |

Unlike Apify's hard 60s/300s ceilings on its own sync endpoints, CloudConvert states **no**
timeout of its own — its docs instead warn "your network stack might automatically time out
requests if there is not data transferred for a longer time" and recommend an async job plus a
webhook for anything slow (video encodes). `convert-url` and `job-create-and-wait` use the sync
host deliberately, for the common case where polling is overkill; `job-wait`/`task-wait` expose it
directly for the general case.

### 2. No scope-agnostic probe — CloudConvert's scopes are fully independent

An API key can be created with any subset of six scopes: `user.read`, `user.write`, `task.read`,
`task.write`, `webhook.read`, `webhook.write`. There is **no endpoint that works under every
combination** — `/v2/users/me` needs `user.read`, every job/task endpoint needs a `task.*` scope,
every webhook endpoint needs a `webhook.*` scope. Apify's `/v2/users/me/limits` (outside every
resource scope) has no CloudConvert equivalent.

`auth/api-token.ts`'s `test` hook probes `GET /v2/jobs?per_page=1` — the scope
(`task.read`) nearly every action in this app actually needs — and its failure message says so
rather than presenting a bare failure, since a key scoped only to `webhook.*` or `user.*` would
otherwise report as broken while doing exactly what its owner intended.

Measured live on 2026-08-29: an **unauthenticated** and an **invalid-bearer** request to
`GET /v2/jobs` answer the **identical** `401 {"message":"Unauthenticated.","code":
"UNAUTHENTICATED"}` — CloudConvert does not distinguish "no credential" from "wrong credential"
the way Apify does.

### 3. No `import/upload` action — local file bytes don't survive this sandbox

CloudConvert's browser-upload flow (`import/upload`) is two steps: create a job, then
`POST multipart/form-data` the file's actual bytes to a one-time signed URL the job hands back.
This app's sandbox coerces every `ctx.fetch` body to a string en route to the network — the same
constraint this pack's `box` and `documenso` apps document — so a binary file's bytes would not
survive that trip intact.

**Every action in this app is scoped to operations that need no file bytes to pass through its own
sandbox at all**: `import/url` and `export/url` (CloudConvert's own workers fetch/serve the bytes),
plus, via `job-create`/`job-create-and-wait`'s free-form task graph, CloudConvert's cloud-storage
import/export operations (S3, Azure Blob, Google Cloud Storage, OpenStack, SFTP) and its
`import/base64`/`import/raw` operations — all of which are JSON parameters CloudConvert's own
servers act on, never bytes this app's sandbox has to relay. `import/upload` and `export/upload`
(the latter genuinely fine — it's CloudConvert PUTting to a URL you provide, not this app handling
bytes — but omitted here to keep the one-shot `convert-url` action's surface small) are left out;
use `job-create` directly if you need `export/upload`.

### 4. A webhook's `signing_secret` comes back on read — by design, not by accident

CloudConvert's own docs: "You can show the signing secret in your webhook settings using the
[Show] button" — the dashboard and the Create/List Webhook responses are the *only* ways to
retrieve it. Unlike Apify's `proxy.password` (a credential nobody asked for), `signing_secret`
here is the intended output: it's what you need to validate the `CloudConvert-Signature` header on
future deliveries. `webhook-create` and `webhook-list` return it verbatim and say so in their
descriptions — treat the result as sensitive, the same discipline you'd apply to any other secret.

### 5. The vendor's own `redirect` parameter is incompatible with this app's egress allowlist

`job-get`, `job-wait`, `job-create` and `job-create-and-wait` all support a documented `redirect`
query/body parameter that 302s straight to the export URL. It is **not exposed by any action
here**: following it would leave `api.cloudconvert.com`/`sync.api.cloudconvert.com` for
`storage.cloudconvert.com`, a host outside `w6w.network.allow` — and even declared, the redirect
target is the raw output file, not JSON, which this app's client cannot parse anyway. Read
`result.files[].url` off the export task in the returned job instead (`convert-url` does this for
you).

## Auth

One method: `api-token`, type `bearer` — `Authorization: Bearer <key>`.

CloudConvert also supports OAuth 2.0 authorization-code and implicit grants for building
multi-tenant apps on behalf of other users' accounts. This app authenticates as the connecting
account itself for every action, so a bearer API key — CloudConvert's own recommended path for
that case — is the whole authentication story; OAuth2 is out of scope here.

### The probe is `GET /v2/jobs?per_page=1`

See "No scope-agnostic probe" above. `per_page=1` keeps the probe cheap on an account with a long
job history; CloudConvert rate-limits only job/task *creation*, not reads, so this costs nothing
against that budget either. The response (a job list) carries no secret — a job's own fields are
`id`, `tag`, `status` and timestamps.

`afterConnect` calls `GET /v2/users/me` (needs `user.read`, which a task-only key will not have)
to publish the account's `email`/`username` for the connection label, and fails silently if that
scope is absent — `test` has already established the key works for whatever it is scoped to.

## Actions

18 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `convert-url` | perform | `POST https://sync.api.cloudconvert.com/v2/jobs` (import/url → convert → export/url) |
| `job-create` | perform | `POST /v2/jobs` |
| `job-create-and-wait` | perform | `POST https://sync.api.cloudconvert.com/v2/jobs` |
| `job-get` | read | `GET /v2/jobs/{id}` |
| `job-wait` | read | `GET https://sync.api.cloudconvert.com/v2/jobs/{id}` |
| `job-list` | search | `GET /v2/jobs` |
| `job-delete` | perform | `DELETE /v2/jobs/{id}` |
| `task-get` | read | `GET /v2/tasks/{id}` |
| `task-wait` | read | `GET https://sync.api.cloudconvert.com/v2/tasks/{id}` |
| `task-list` | search | `GET /v2/tasks` |
| `task-cancel` | perform | `POST /v2/tasks/{id}/cancel` |
| `task-retry` | perform | `POST /v2/tasks/{id}/retry` |
| `task-delete` | perform | `DELETE /v2/tasks/{id}` |
| `operation-list` | search | `GET /v2/operations` (public, no auth) |
| `user-get` | read | `GET /v2/users/me` |
| `webhook-create` | perform | `POST /v2/webhooks` |
| `webhook-list` | search | `GET /v2/users/me/webhooks` |
| `webhook-delete` | perform | `DELETE /v2/webhooks/{id}` |

### Idempotency

**No job/task creation endpoint documents an idempotency key.** `job-create`, `job-create-and-wait`,
`convert-url` and `task-retry` all start real, separately-billed work, so they are `idempotent:
false` — a retry duplicates both the job/task and the conversion-credit spend. `webhook-create` is
also `false`: unlike some vendors, CloudConvert states no idempotency key for it either, so every
call creates a new webhook. `task-cancel` is `false` too — CloudConvert says cancellation is valid
for a task in `waiting`/`processing` but does not document what a repeat call against an
already-terminal task does, so this app does not assume it is a safe no-op.

`job-delete`, `task-delete` and `webhook-delete` are `idempotent: true` — a delete's end state is
the same however many times it runs, and CloudConvert answers an empty `204` either way.

### Notes on individual actions

- **`convert-url` is the app's centre of gravity.** It builds the exact `import/url` → `convert` →
  `export/url` graph CloudConvert's own "Convert Files" doc uses as its worked example, runs it on
  the synchronous host, and returns the export task's `result.files` directly — no polling. On a
  job `status: "error"`, it throws with the failing task's own `message`/`code` rather than
  returning a value that looks like success, per CloudConvert's "please do not automatically retry
  tasks" guidance.
- **`job-create`/`job-create-and-wait` expose the full task graph as a free-form `tasks` JSON
  param**, matching CloudConvert's own request body 1:1, rather than a generated per-operation
  form. CloudConvert documents well over a dozen operations (`import/s3`, `optimize`,
  `capture-website`, `merge`, `pdf`, `archive`, `metadata`, `execute`, …), several of which
  (`convert` chief among them) further vary their own parameters by `input_format`/`output_format`
  — modelling that as static fields would either omit most of the surface or drift out of sync
  with it.
- **`job-list`'s `filter[status]` excludes `waiting`** — CloudConvert's own docs list only
  `processing`, `finished` and `error` as valid values for that filter, even though a job's actual
  `status` field can also be `waiting`.
- **List pagination is Laravel-style, not offset/limit.** `job-list`, `task-list` and
  `webhook-list` all return `links: {first, last, prev, next}` and
  `meta: {current_page, from, path, per_page, to}` — there is no `total`, unlike some other apps in
  this pack.
- **`webhook-create`/`webhook-list` return `signing_secret` verbatim.** See finding 4 above.
- **Rate limiting only applies to job/task creation.** CloudConvert's docs: "these endpoints are
  currently rate limited: Creating tasks, Creating jobs" — a `429` from `job-create`,
  `job-create-and-wait`, `convert-url` or any task-creating call carries `Retry-After`; every read
  action here carries no rate-limit header at all (measured live).

## Health checks

Three declared checks plus the derived `auth:api-token`.

### `service` — `status.cloudconvert.com` is a Better Stack page, not Atlassian Statuspage

Verified three ways on 2026-08-29. **(a)** The Atlassian-shaped paths this pack usually tries
first do not exist here — `/api/v2/summary.json`, `/api/v2/status.json` and a nonsense path all
answer the *identical* `301` to `https://status.cloudconvert.com/` with 0 bytes, the site's
generic redirect-everything-unknown behaviour. The real route, `/index.json`, answers `200` with
77,783 bytes of Better Stack's own JSON. **(b)** It self-identifies: `company_name: "CloudConvert"`,
`company_url: "https://cloudconvert.com"`. **(c)** It carries a matching component — three
sections (`Endpoints`: Webinterface, **API**; `Regions`: EU Central, US East; `Conversions`:
General, Video & Audio, Office, iWork), eight resources total.

Unlike Hugging Face's page in this pack (which doesn't cover the third-party providers its
inference actions call), every resource on CloudConvert's page is CloudConvert's own
infrastructure, so severity is left at the default `degraded` rather than capped to
`informational`. The check trusts the page's own `aggregate_state` roll-up over a locally
recomputed worst-component fold, the same discipline Statuspage's `status.indicator` gets
elsewhere in this pack.

### `quota` — conversion credit balance, from `GET /v2/users/me`

CloudConvert charges conversion credits per completed task and returns the current balance as a
plain `credits` integer — no ceiling alongside it, since a plan's "limit" isn't a number the API
states. This is the one quota dimension readable without a side effect. Needs `user.read`; a `403`
(a task-only key) reports `unknown`, never `degraded` — refusing to read the balance says nothing
about whether it's low. The low-credit threshold (`10`) is this **app's own** conservative floor,
not a vendor-documented one.

### ~~`request-rate`~~ — a declared absence, at `informational` severity

CloudConvert's rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) appear **only** on
job/task *creation* responses — measured live 2026-08-29, a plain `GET /v2/jobs` or
`GET /v2/operations` carries neither header. Reading this headroom would mean spending a create
call, which is not a side-effect-free probe. `severity: "informational"` keeps a declared absence
from pinning the app's verdict at `unknown` forever.

## Deliberately not covered

CloudConvert's operation catalog (`GET /v2/operations`) lists well over a hundred conversion pairs
across a dozen-plus operation types. This app covers the job/task/webhook/user lifecycle and the
URL-based import/convert/export path; what's left out, and why:

- **`import/upload` and its browser-upload flow** — see finding 3 above. Left out rather than
  shipping an action that silently corrupts non-text files.
- **Per-operation convert forms** (optimize, watermark, capture-website, thumbnail, merge, PDF
  operations, archive, metadata, execute-command) — each has its own parameter set, and `convert`
  itself varies by format pair. `job-create`/`job-create-and-wait`'s free-form `tasks` param covers
  all of them without drifting out of sync with CloudConvert's own evolving catalog; see the note
  on individual actions above.
- **Cloud-storage import/export as dedicated actions** (S3, Azure Blob, Google Cloud Storage,
  OpenStack, SFTP) — these are JSON-only task parameters (CloudConvert's own workers move the
  bytes), fully reachable today through `job-create`'s `tasks` param; not duplicated as one action
  per provider to keep the action count proportional to what each one actually does differently.
- **`export/upload`** (PUT to an arbitrary URL) — genuinely safe for this sandbox (CloudConvert
  does the PUTting, not this app), but left out of the one-shot `convert-url` action to keep its
  surface small; reachable via `job-create`.
- **The `redirect` parameter** on job/create/get/wait — see finding 5 above.
- **OAuth 2.0** — this app authenticates as the connecting account itself; see Auth above.

Nothing was left out because it could not be confirmed: every endpoint above is documented on
CloudConvert's own reference pages and was read there.

## Icon

`assets/icon.svg` is CloudConvert's own mark, downloaded **verbatim** from
`https://cloudconvert.com/docs/logo.svg` on 2026-08-29 — 5,623 bytes, `image/svg+xml`, the grey
cloud + red refresh-arrows mark also served as `rel="icon"` on both `cloudconvert.com` and its docs
site (confirmed byte-identical to `cloudconvert.com/build/assets/favicon-144-*.png` at 144×144). It
is not formatted by `deno task fmt`, whose file list names only the `.ts` directories.

## Layout

```
cloudconvert/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # CloudConvertClient, the two hosts, error formatting
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # bearer key: sign, test, afterConnect
├── actions/                     # one file per action (18)
├── health/
│   ├── service.ts                # status.cloudconvert.com (Better Stack)
│   ├── quota.ts                   # conversion credit balance, signed
│   └── request-rate.ts            # declared absence, informational
├── assets/icon.svg              # vendor mark, verbatim
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
