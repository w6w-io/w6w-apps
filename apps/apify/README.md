# Apify

Run Apify Actors and tasks, poll the runs they create, and read or write the datasets and key-value
stores those runs produce, on the **Apify API v2**.

- **Categories** — developer-tools, storage, ai
- **Auth methods** — api-token
- **Actions** — 31
- **Health checks** — 3 (`service`, `quota`, ~~`request-rate`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.apify.com` (the `service` check adds `status.apify.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://apify.com/
- **API docs** — https://docs.apify.com/api/v2
- **OpenAPI** — https://docs.apify.com/api/openapi.json
- **Status page** — https://status.apify.com/

Apify is a platform for running **Actors**: containerised scraping and automation programs, either
your own or one of ~46,000 published in Apify Store. An Actor *run* writes its results to a
**dataset** and its summary output to a **key-value store**. So the shape of almost every workflow
against this API is the same three beats — start a run, wait for it, read its dataset — and this
app's centre of gravity is exactly that path.

> **Everything below was verified against Apify's own sources on 2026-08-11** — its machine-readable
> OpenAPI 3.1 document ([`docs.apify.com/api/openapi.json`](https://docs.apify.com/api/openapi.json),
> 999,786 bytes, `info.version` `v2-2026-08-05T133145Z`), the `docs.apify.com` pages it links, and
> live probes against `api.apify.com` and `status.apify.com`. Nothing here came from a third-party
> integration directory.

## The five things most likely to go wrong

### 1. Ordinary reads hand you live credentials

This is the finding that shaped the app. Three fields in Apify's ordinary read responses are working
credentials:

| Endpoint                              | Field                  | What it actually is                                   |
| ------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `GET /v2/users/me`                    | `proxy.password`       | The account's **Apify Proxy password** — the whole credential for `proxy.apify.com` |
| `GET /v2/datasets/{id}`               | `urlSigningSecretKey`  | The HMAC key that mints signed public URLs for that dataset's contents |
| `GET /v2/key-value-stores/{id}`       | `urlSigningSecretKey`  | The same, for that store's records                     |

None of them is behind a special scope or a query flag; they arrive with the profile lookup and the
metadata read. A workflow step's result is persisted in the run record and routinely echoed into
logs, previews and downstream steps, so returning any of them would turn one read into a durable
credential leak.

**All three are deleted before an Action returns** (`stripSecrets` in
[`lib/client.ts`](lib/client.ts)). The strip is deliberately narrow — it walks those exact documented
paths and nothing else, because this app's payload is *scraped data*, and a heuristic that ate any
field named `password` or `token` would corrupt the very thing the user is collecting. `proxy.groups`
survives; a user's own scraped `password` field survives. The values remain visible to their owner in
Apify Console.

The invariant is enforced rather than remembered: a test in
[`tests/index.test.ts`](tests/index.test.ts) derives, from every action's own source, the set of
actions that request a secret-bearing path, and asserts it is exactly the set that calls
`stripSecrets`. Adding `GET /v2/key-value-stores/{id}` in a new file without stripping fails the
suite.

**One thing is deliberately *not* stripped**: a webhook's `headersTemplate`. Unlike the three above it
is not an Apify-issued value at a known path but arbitrary user text, whose documented purpose is to
carry auth headers to the receiving service. Removing it would break read-modify-write of a webhook,
and guessing which parts are secret would corrupt it. So `webhook-list` states the risk in its
description instead: if your webhook templates carry a secret, treat that action's result as
sensitive.

### 2. Three response shapes, not one

Apify's introduction says most endpoints answer `{"data": …}`, then names the exceptions in passing.
Missing them is the most common way an integration breaks:

| Shape                       | Endpoints                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `{"data": …}`               | Everything not listed below                                                        |
| **Bare JSON array**         | `GET /v2/datasets/{id}/items`, `GET /v2/actor-runs/{id}/dataset/items`, both `run-sync-get-dataset-items` endpoints |
| **The stored value itself** | `GET /v2/key-value-stores/{id}/records/{key}` — served under the content type it was written with |
| **`text/plain`**            | `GET /v2/actor-runs/{id}/log`                                                      |

[`lib/client.ts`](lib/client.ts) exposes `data()`, `json()` and `raw()` for the three rather than
pretending there is one. Note also that both run endpoints and the record/webhook/dataset creates
answer **`201`**, not `200`.

Two smaller shape traps in the same family:

- **Dataset-item paging metadata is in the headers, not the body.** `X-Apify-Pagination-Total`,
  `-Offset`, `-Count` and `-Limit`, which is what the endpoint's CORS policy exposes. There is no
  `total` in the array.
- **Key-value-store keys page by key, not by offset.** `GET /v2/key-value-stores/{id}/keys` is the
  single documented exception to offset pagination in the whole API — records are ordered by key in
  UTF-8 binary order, so it takes `exclusiveStartKey` and answers `{limit, isTruncated,
  exclusiveStartKey, nextExclusiveStartKey, items}` with no `total` to loop against.

### 3. The vendor's list defaults are enormous

`limit` defaults to its **maximum** of 1,000 on every resource list, and to **no limit at all** on
dataset items. Measured on 2026-08-11: `GET /v2/store` with the vendor default returns **3.8 MB**
across a Store of 46,050 Actors.

Every list action here therefore prefills a small limit and says so in the field hint — 100 for the
resource lists and dataset items, 20 for the Store search. That is a deliberate divergence from the
API default, visible in the form, and raising it is one edit.

Related, and easier to misread: **the storage lists return named storages only.** `GET /v2/datasets`,
`GET /v2/key-value-stores` and `GET /v2/request-queues` all omit unnamed storages unless `unnamed=1`
is passed — and *every storage an Actor run creates for itself is unnamed*. An account with a
thousand runs and no named datasets gets a correct, empty list and reads it as a bug. The
"Include unnamed storages" toggle is off by default (matching the API) and says exactly this.

### 4. Two spellings of the same states, in one API

| Concept        | Run status (`ActorJobStatus`) | Webhook event type   |
| -------------- | ----------------------------- | -------------------- |
| Timed out      | `TIMED-OUT` (**hyphen**)      | `ACTOR.RUN.TIMED_OUT` (**underscore**) |
| Timing out     | `TIMING-OUT`                  | —                    |

Filtering `GET /v2/actor-runs?status=TIMED_OUT` returns nothing rather than erroring. Both
vocabularies are transcribed verbatim in [`lib/params.ts`](lib/params.ts) and pinned by tests.

### 5. Scoped tokens are a supported configuration, not a broken one

An Apify token may be **scoped**: limited to account-level permissions and to specific resources.
Apify's own guidance for a third-party integration is to use one — "create a scoped token that can
only run the Actor you need, and share it with the service". So this app has to treat a scoped token
as healthy, which drives two decisions:

- The health probe is an endpoint no scope can take away (see below).
- A refusal surfaces Apify's `insufficient-permissions` code verbatim rather than as a bare 403,
  because that is a different problem with a different fix from a bad token.

Two scoping rules worth knowing when a run fails: **running a task needs two permissions** — **Run**
on the Actor the task executes *and* **Read** on the task, since tasks have no dedicated run
permission — and **a scoped token cannot create or modify Actors at all**. This app declares no
Actor-authoring action, so nothing here requires an unscoped token.

## Auth

One method: `api-token`, type `bearer`.

Apify documents **two** ways to present the token — the `Authorization: Bearer` header and a
`?token=` query parameter. This app only ever uses the header, and the query form is unreachable from
any action, for the reason the vendor itself gives: "URLs are often stored in browser history and
server logs." A workflow host logs request URLs; it does not log request headers.

Apify publishes no OAuth surface for third-party apps, so the token is the whole authentication
story.

### The probe is `GET /v2/users/me/limits`, and it was chosen by reading the schema

Measured and checked on 2026-08-11:

| Candidate                  | Requires a credential?                    | Survives a scoped token? | Leaks anything? |
| -------------------------- | ----------------------------------------- | ------------------------ | --------------- |
| **`/v2/users/me/limits`**  | ✅ `401 token-not-provided` unauthenticated | ✅ account metadata, not a resource | ✅ nothing but ceilings and usage |
| `/v2/users/me`             | ✅                                         | ✅                        | ❌ **returns `proxy.password`** |
| `/v2/store`                | ❌ **answers `200` with no token at all**   | ✅                        | ✅               |
| `/v2/datasets`, `/v2/actor-tasks` | ✅                                  | ❌ exactly what a scope can refuse | ✅ |

`/v2/store` is the trap that matters most: a Connection whose credential never got attached would
pass a probe against it. `/v2/users/me` is the trap this pack has hit twice before — Follow Up Boss's
`/me` and Mailjet's `/apikey` both return the caller's own credential, and both are banned pack-wide.
`/v2/users/me/limits` is the one endpoint that is none of those things, which is why it is
simultaneously the credential probe, the `quota` check's source, and the `account-limits-get` action.

The probe distinguishes Apify's error codes rather than collapsing them:

| Code                      | Status | Reported as                                     |
| ------------------------- | ------ | ----------------------------------------------- |
| `token-not-provided`      | 401    | the credential never reached the request        |
| `user-or-token-not-found` | 401    | the token is wrong, revoked or deleted          |
| `insufficient-permissions`| 403    | the token is real but refused                   |

`afterConnect` is the **one** place this app calls `/v2/users/me`, and it keeps exactly two fields —
`username` and `id`. The username is worth the trip because Apify's `username~resource-name`
addressing form is unusable without it. Everything else, `proxy` above all, is dropped inside the
hook and never published.

## Actions

31 actions. `resource` groups them in the editor.

| Key                            | Type      | Endpoint                                                        |
| ------------------------------ | --------- | --------------------------------------------------------------- |
| `actor-list`                   | search    | `GET /v2/actors`                                                |
| `actor-get`                    | read      | `GET /v2/actors/{actorId}`                                      |
| `actor-run`                    | perform   | `POST /v2/actors/{actorId}/runs`                                |
| `actor-run-sync-get-items`     | perform   | `POST /v2/actors/{actorId}/run-sync-get-dataset-items`          |
| `store-search`                 | search    | `GET /v2/store`                                                 |
| `run-list`                     | search    | `GET /v2/actor-runs`                                            |
| `run-get`                      | read      | `GET /v2/actor-runs/{runId}`                                    |
| `run-abort`                    | perform   | `POST /v2/actor-runs/{runId}/abort`                             |
| `run-resurrect`                | perform   | `POST /v2/actor-runs/{runId}/resurrect`                         |
| `run-log-get`                  | read      | `GET /v2/actor-runs/{runId}/log`                                |
| `run-dataset-items-get`        | read      | `GET /v2/actor-runs/{runId}/dataset/items`                      |
| `task-list`                    | search    | `GET /v2/actor-tasks`                                           |
| `task-get`                     | read      | `GET /v2/actor-tasks/{actorTaskId}`                             |
| `task-run`                     | perform   | `POST /v2/actor-tasks/{actorTaskId}/runs`                       |
| `task-run-sync-get-items`      | perform   | `POST /v2/actor-tasks/{actorTaskId}/run-sync-get-dataset-items` |
| `dataset-list`                 | search    | `GET /v2/datasets`                                              |
| `dataset-get`                  | read      | `GET /v2/datasets/{datasetId}`                                  |
| `dataset-create`               | perform   | `POST /v2/datasets`                                             |
| `dataset-items-get`            | read      | `GET /v2/datasets/{datasetId}/items`                            |
| `dataset-items-push`           | perform   | `POST /v2/datasets/{datasetId}/items`                           |
| `key-value-store-list`         | search    | `GET /v2/key-value-stores`                                      |
| `key-value-store-get`          | read      | `GET /v2/key-value-stores/{storeId}`                            |
| `key-value-store-keys-list`    | search    | `GET /v2/key-value-stores/{storeId}/keys`                       |
| `record-get`                   | read      | `GET /v2/key-value-stores/{storeId}/records/{recordKey}`        |
| `record-set`                   | perform   | `PUT /v2/key-value-stores/{storeId}/records/{recordKey}`        |
| `webhook-list`                 | search    | `GET /v2/webhooks`                                              |
| `webhook-create`               | perform   | `POST /v2/webhooks`                                             |
| `webhook-delete`               | perform   | `DELETE /v2/webhooks/{webhookId}`                               |
| `account-get`                  | read      | `GET /v2/users/me`                                              |
| `account-limits-get`           | read      | `GET /v2/users/me/limits`                                       |
| `account-usage-get`            | read      | `GET /v2/users/me/usage/monthly`                                |

### Idempotency

**Apify's run endpoints accept no idempotency key of any kind.** Every call starts a separately
billed run, so a retry is a second paid crawl — `actor-run`, `task-run`, both sync variants and
`run-resurrect` are all `idempotent: false`, and the runtime must not retry them on its own.

The one exception is **`webhook-create`**, which the vendor documents as taking an `idempotencyKey`:
"multiple calls to create a webhook with the same `idempotencyKey` will only create the webhook with
the first call and return the existing webhook on subsequent calls". This app sends
`ctx.invocation.invocationId`, which is exactly the "UUID or another random string with enough
entropy" the vendor asks for and is stable across retries of one step. That matters more than it
looks: a duplicated webhook is not a harmless duplicate, it is every downstream notification
delivered twice, forever, with nothing to notice it by.

`run-abort`, `record-set` and `webhook-delete` are `idempotent: true` — an already-finished run "does
nothing" per the vendor, a `PUT` is a full overwrite, and a delete's end state is the same however
many times it runs.

### Notes on individual actions

- **`actor-run` vs `actor-run-sync-get-items`.** The sync form runs the Actor and returns its items
  in one call, but it hard-fails with `408` after **300 seconds** — and returns *nothing about the
  run it started*, so there is no handle to poll and no easy way to collect the results afterwards.
  Anything that might be slow belongs in `actor-run` → `run-get` (poll) → `dataset-items-get`.
  `waitForFinish` on the async form caps at 60 seconds and collapses that to one call for fast
  Actors.
- **`run-get` costs are preliminary right after completion.** The vendor's own note: wait about ten
  seconds and read again before billing against `usageTotalUsd`.
- **`run-resurrect` reuses the run's existing storages**, which is the point — a crawl that died
  three quarters through continues. It also means a second resurrection appends to a dataset a
  previous step may already have read. The `build` override exists because "the same build" drifts: a
  run first started from the `latest` tag resurrects against what `latest` meant *then*.
- **`task-run` merges its input.** Overrides are applied property by property over the task's stored
  input; anything not named keeps the task's own value. Sending no overrides sends no body at all.
- **`dataset-create` is get-or-create only when named.** Named: returns the existing dataset if there
  is one, kept indefinitely, visible in `dataset-list`. Unnamed: a new dataset every call, expiring
  with the plan's data retention period, hidden from the default list. Idempotency is a property of
  the caller's input here, not of the endpoint, so the declaration is the honest `false`.
- **`dataset-items-push` is all-or-nothing** against a dataset schema — "the whole request is
  discarded" with a `400` — and caps at **5 MB** per request.
- **`record-get` reports binary records rather than mangling them.** A run's `OUTPUT` is often a PNG
  or a zip, and those bytes do not survive being decoded as a JS string, so a non-textual record
  comes back as `value: null` with a note naming its content type. Its `attachment` toggle exists
  because Apify "can perform small modifications to HTML documents before they are served" — that
  flag is the only documented way to get stored HTML back byte-for-byte.
- **`run-log-get` truncates at 200,000 characters** by default and says whether it did. That cap is
  this app's, not Apify's: a long-running Actor's log has no documented size ceiling.
- **`account-get` and the two storage reads redact.** See finding 1.

## Health checks

Three declared checks plus the derived `auth:api-token`.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path — is this a catch-all?** No.

| Path                                   | Status  | Bytes  | md5 (first 12) |
| -------------------------------------- | ------- | ------ | -------------- |
| `/api/v2/summary.json`                 | 200     | 11,465 | `39aa0c321a4e` |
| `/api/v2/status.json`                  | 200     | 221    | `5636859aa4af` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0**  | —              |

**(b) Content-type and body.** `application/json; charset=utf-8`, parsing as the Statuspage v2
schema. Neither known unclaimed-host signature matches: an unclaimed `*.statuspage.io` is ~127,700 B
of HTML, an unclaimed `*.instatus.com` is ~216,800 B. This is 11,465 B of JSON.

**(c) Does the page describe *this* product?** Yes —
`"page": {"id": "j23nkrf8p8p8", "name": "Apify", "url": "https://status.apify.com"}`, with 29
components that are Apify's own: `API (api.apify.com)`, `Console (console.apify.com)`, `Actors`,
`Scheduler`, `Webhooks`, `MCP server (mcp.apify.com)`, the `Storage` group (Dataset, Key-value store,
Request queue) and the `Proxy` group (Datacenter, Residential, SERP).

Two things shape the code. **Eleven of the twenty-nine components are not Apify** — the
`External services` group carries AWS EC2/S3/SQS/ELB/ECR/EKS/DynamoDB/ElastiCache, Stripe, Mailgun
and npm. They
are genuinely upstream, so they are reported, but the verdict comes from `status.indicator` (Apify's
own roll-up) rather than from the worst component, or a bad day at npm would report Apify down.
Components are keyed by the vendor's stable **id**, with the name in the message, and `group: true`
container rows are excluded so the storage and proxy services are not double-counted.

Severity is left at the `degraded` default: Apify is SaaS-only, so every Connection this app can hold
runs on exactly the infrastructure this page describes.

### `quota` — a live probe, because plan headroom *is* readable

`GET /v2/users/me/limits` returns the ceiling **and** the current figure for eight metered
dimensions: monthly spend in USD, compute units, external data transfer, proxy SERPs, residential
proxy traffic, concurrent runs, Actor count and task count. This check reports all eight as
`HealthQuota` readings with the usage cycle's end as `resetAt`.

The state rule distinguishes what stops work from what queues: a **monthly** allowance at 100% is
`down` (an account that hits `maxMonthlyUsageUsd` cannot start runs), a concurrency ceiling at 100%
is only `degraded` (that is a queue, not an outage), and anything at or over 90% is `degraded` with
the dimension named. A **non-positive ceiling means "not configured", not "exhausted"** —
`maxMonthlyUsageUsd` is a limit the account owner sets, and reading zero the other way would report
every unlimited account as broken.

The two objects use different names for the same dimension and no prefix rule covers both
(`maxConcurrentActorJobs` pairs with `activeActorJobCount`), so the mapping is explicit and pinned by
a test.

### ~~`request-rate`~~ — a declared absence, at `informational` severity

Apify's *other* meter is not readable in advance. Live responses carry `X-RateLimit-Limit` — the
ceiling, 90 on `/v2/users/me` and 60 on `/v2/store`, measured 2026-08-11 — and **no**
`X-RateLimit-Remaining` and **no** reset header. The vendor's rate-limiting page documents the
ceilings as fixed numbers and says the only signal is the `429` itself.

Those ceilings, for the record: 250,000 requests/minute globally; 60/second **per resource** by
default, where a resource is a single Actor, run, dataset or store; 200/second for key-value-store
record CRUD; 400/second for the run endpoints, metamorph, dataset push and request-queue request
CRUD. The documented remedy is client-side exponential backoff.

It is kept separate from `quota` rather than folded in, so a healthy plan-headroom reading cannot
imply something about rate headroom that Apify never told us. `severity: "informational"` is
load-bearing: an `unavailable` entry always reports `unknown`, `unknown` outranks `ok` in the
roll-up, and at any other severity this would pin the app's verdict at `unknown` forever.

## Deliberately not covered

Apify's API has **229 documented operations**. This app covers 31, chosen as the run-and-read path a
workflow actually needs. What is left out, and why:

- **Request queues** (`/v2/request-queues/**`, plus the per-run and per-task convenience routes) —
  the crawl frontier. It is a live coordination structure with request locking, lock prolongation,
  batch add/delete and head-locking semantics; those are operations an Actor performs on *itself*
  from inside a run, not things a workflow step drives from outside. Left out rather than
  half-covered.
- **Actor authoring** — create/update/delete Actor, versions, environment variables, builds, build
  abort, `validate-input`, and the per-build OpenAPI route. This is source management, not
  automation, and Apify does not permit a scoped token to do any of it.
- **Schedules** (`/v2/schedules/**`) — genuinely useful, and omitted only for scope. Worth adding.
  Note when it is added that a scheduled run always injects an **unscoped** token into the Actor,
  regardless of the scope of the token that created the schedule.
- **Webhook dispatches** (`/v2/webhook-dispatches/**`, `/v2/webhooks/{id}/dispatches`) and
  `POST /v2/webhooks/{id}/test` — delivery-history debugging.
- **Metamorph and reboot** (`/v2/actor-runs/{id}/metamorph`, `/reboot`) — an Actor transforming
  itself mid-run; same reasoning as request queues.
- **`POST /v2/actor-runs/{id}/charge`** — pay-per-event billing, callable only from inside the run
  being charged.
- **The `/v2/actors/{id}/runs/last/**` and `/v2/actor-tasks/{id}/runs/last/**` families** — 70
  operations that are convenience aliases for "whatever ran most recently". They are reachable
  explicitly through `run-list` (newest first) plus the run actions, which is a workflow you can read
  six months later.
- **Non-JSON dataset formats** — the items endpoints also serve CSV, XLSX, HTML, XML and RSS. An
  Action hands structured data to the next step, not a file, and an XLSX workbook has no meaningful
  JSON projection, so `format` is pinned to the vendor's own default of `json`.
- **Log streaming** (`?stream=1`) — holds the connection open for the life of the run. An Action
  returns one value, so it would only produce a request that hangs.
- **The `?token=` query authentication form** — works, and is deliberately unreachable. See Auth.
- **Agentic payments** (x402 `PAYMENT-SIGNATURE`, Skyfire `skyfire-pay-id`) — an alternative to
  having an Apify account at all. Out of scope for a Connection-based app.
- **`GET /v2/actor-tasks/{id}/input`** — returns a task's stored input, which is user-authored and
  can hold whatever the Actor's schema calls for, including fields the Actor treats as secret. Left
  out rather than shipping a read whose sensitivity this app cannot characterise; `task-get` returns
  the task's definition and run options without it.
- **The legacy `/v2/acts/` prefix** — still fully functional and routed to the same handlers, but
  deprecated. This app only builds the canonical `/v2/actors/` form.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` is Apify's own mark, downloaded **verbatim** from `https://apify.com/favicon.svg`
on 2026-08-11 — 774 bytes, `image/svg+xml`, md5 `7d2c23f2e6214318e03d7135afd2cee1`, a 1080×1080
square of three coloured paths (`#246DFF`, `#20A34E`, `#F86606`). It is byte-identical to the
download and is not formatted by `deno task fmt`, whose file list names only the `.ts` directories. A
test asserts the byte length and the three vendor colours, so a redraw fails the suite.

## Layout

```
apify/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ApifyClient, the three response shapes, error formatting, redaction
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # bearer token: sign, test, afterConnect
├── actions/                     # one file per action (31)
├── health/
│   ├── service.ts               # status.apify.com
│   ├── quota.ts                 # plan headroom, signed
│   └── request-rate.ts          # declared absence, informational
├── assets/icon.svg              # vendor mark, verbatim
└── tests/                       # 201 tests: entry module, every action, auth, health, lib
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

`deno task validate` passes `--config ./deno.json` explicitly. Without it, `_tools/audit.ts` picks up
`_tools/deno.json` as its configuration and cannot resolve the `@w6w/types` **value** import in
`health/service.ts` (`worstHealthState`); this reproduces identically for the sibling `paddle` app, so
it is a property of how the tool is invoked, not of this app.
