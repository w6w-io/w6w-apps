# Onfleet

Dispatch and track last-mile deliveries — create tasks, manage workers, teams
and hubs, and get notified as tasks move through Onfleet.

- **Categories** — commerce, productivity
- **Auth methods** — api-key
- **Actions** — 32
- **Egress allowlist** — `onfleet.com` (the `service` health check adds
  `status.onfleet.com`)
- **Website** — https://onfleet.com
- **API docs** — https://docs.onfleet.com/reference

This app was built directly against Onfleet's own hosted API reference
(`docs.onfleet.com/reference/*`, a ReadMe.com site) and probed live on
2026-08-29. Onfleet publishes no OpenAPI document; every request/response
shape here is taken verbatim from that reference's documented examples.

## Setup

### API Key

Onfleet Dashboard → **Settings → API & Webhooks**. It is sent as HTTP Basic
with **the key as the username and an empty password** — a trailing colon
with nothing after it. Confirmed against `docs.onfleet.com/reference/authentication`.

A key can optionally be **scoped** to only the tasks it creates itself
(`docs.onfleet.com/reference/scope-api-key`). A scoped key still works with
every action here — Onfleet just answers a permissions error for anything
outside its own tasks, rather than this app refusing it up front.

## The container model — every task belongs to exactly one list

Tasks are never "unowned": each one sits in exactly one **container** — the
organization's own pool, a team, or a worker — which is an ordered list.
Creating a task with no `container` puts it in the creating organization's
unassigned pool; setting one at creation or via `task-update` moves it.
`autoAssign` is the alternative to a `container` — Onfleet's own automatic
assignment among on-duty workers — and the two cannot be combined.

## State only moves forward, and Onfleet locks down what you can touch

A task's `state` — `0` unassigned, `1` assigned, `2` active, `3` completed —
only advances; there is no cancel endpoint, only `task-delete` (unassigned
only) and `task-complete` (force-completes an active task). **Once a task
passes `unassigned`, most fields stop accepting updates**: an active task
takes only `notes`/`metadata`, and a completed one only `metadata`/custom
fields — anything else sent to `task-update` is silently ignored rather than
rejected. `task-update`'s description says this explicitly, since it is the
easiest assumption to get wrong.

## Actions

| Key | Type | Description |
|---|---|---|
| `task-create` | perform | Create a delivery/pickup task |
| `task-get` | read | One task, incl. completion details, ETA, delay |
| `task-update` | perform | Update — restricted once active/completed |
| `task-delete` | perform | Delete — unassigned tasks only |
| `task-complete` | perform | Force-complete an active task |
| `task-list` | search | Paginated, 64 per page, by time window |
| `worker-create` | perform | Add a driver/courier |
| `worker-get` | read | One worker, optionally with analytics |
| `worker-update` | perform | Update — `phone` cannot change |
| `worker-delete` | perform | Remove — fails while a task is active |
| `worker-list` | search | Every worker, filterable by team/duty state |
| `worker-list-by-location` | search | Workers within a radius of a point |
| `team-create` | perform | Group workers under managers |
| `team-get` | read | One team |
| `team-update` | perform | Update — `workers`/`managers` REPLACE the list |
| `team-delete` | perform | Delete — workers are unassigned, not deleted |
| `team-list` | search | Every team |
| `organization-get` | read | This connection's own organization |
| `organization-get-delegatee` | read | A connected organization's details |
| `destination-create` | perform | Create a reusable, geocoded address |
| `destination-get` | read | One destination |
| `hub-create` | perform | Create a hub, optionally assigned to teams |
| `hub-update` | perform | Update a hub |
| `hub-list` | search | Every hub — there is no get-single-hub endpoint |
| `webhook-create` | perform | Register a URL for one of 29 documented triggers |
| `webhook-list` | search | Every webhook, incl. delivery count |
| `webhook-update` | perform | Update a webhook |
| `webhook-delete` | perform | Remove a webhook |
| `recipient-create` | perform | Create a reusable recipient |
| `recipient-get` | read | One recipient |
| `recipient-update` | perform | Update — `phone` cannot change |
| `recipient-find` | read | Exact-match lookup by name or phone |

## Four things that go wrong quietly

### 1. Updating a task past `unassigned` silently drops most fields

`docs.onfleet.com/reference/update-task`: an active task accepts only
`notes`/`metadata`; a completed one only `metadata`/custom fields. Onfleet
does **not** reject the extra fields — it answers `200` and just ignores
them. A workflow that reassigns a task's `container` after it has started
will see success and no effect. `task-update`'s description says this in
plain words rather than leaving it to be discovered.

### 2. `phone` looks like an ordinary field and is actually an identity

Both `worker-update` and `recipient-update` accept a `phone` in the response
shape, and both silently ignore it if sent in an update — phone is each
entity's unique identifier in Onfleet, and changing it means creating a new
entity instead. Neither update action offers the field at all, rather than
accepting it and doing nothing.

### 3. An empty rate list from `worker-list`/`task-list` can be a 502, not "no results"

Onfleet documents an internal **70-second timeout** on both the list-workers
and list-tasks endpoints (`docs.onfleet.com/reference/list-workers`,
`/list-tasks`) — a broad, unfiltered query on a busy organization can time
out with a 502 rather than answer slowly. Narrowing the query (a team, a
state, a shorter time window) is the documented fix, not a retry.

### 4. The shared rate limit is organization-wide, not per key

Onfleet allows **20 requests per second across every API key the
organization has**, not 20 per key (`docs.onfleet.com/reference/throttling`).
A workflow hitting 429s may be sharing its budget with an entirely different
integration on the same account — `quota`'s health check message says the
budget is shared for exactly this reason.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Onfleet's API up? (Dashboard/driver-app/etc. are named but don't decide the verdict) |
| `quota` | quota | Headroom on the shared 20 req/s budget, read from `X-RateLimit-*` headers |
| `auth:api-key` | credential (derived) | Is this key live? — `GET /auth/test` |

### `status.onfleet.com` is a real, working Statuspage instance

Verified live 2026-08-29: page id `l92bng659fhp`, 21 components, including
`API`, `Dashboard`, `Maps`, `iOS`, `Android`, `Locations streaming`,
`Locations storage`, `Search`, `ETA`, `Route Optimization`, and several
telephony/SMS proxy components. Only `API` decides `service`'s verdict —
everything else this app never calls through — but any other affected
component is named in the message, since a workflow reading `eta` or worker
locations benefits from knowing `Locations streaming` is degraded even
though the call that reads it still succeeds with stale data.

### `/auth/test` does double duty without leaking anything

Onfleet's own documented way to check a key
(`docs.onfleet.com/reference/testing-your-api-key`) answers with one line —
`"Hello organization '<id>' hitting Onfleet from <ip>"` — naming neither the
key nor any account secret. The `auth:api-key` credential check and the
`quota` headroom check both read this same cheap call rather than spending a
second request on a call that does nothing else; there is no dedicated usage
endpoint to read from instead.

## What this app deliberately does not do

- **Route optimization and route plans.** A route plan changes what fields a
  task returns (`routePlan`, `priority`, `group`) and has its own
  multi-endpoint lifecycle (`initialize` → `status` → `apply`) that is a
  planning workflow in its own right, not a single automation step.
- **Barcode scanning and custom task templates.** Both are Scale-tier
  dashboard features layered onto task creation with their own configuration
  surface (`docs.onfleet.com/reference/barcode-scanning`,
  `/creating-tasks-with-custom-task-templates`) rather than a stable, plan-
  independent request shape.
- **Batch task creation (sync and async).** Both are their own job/webhook
  lifecycle distinct from creating one task, and are better served by
  running `task-create` once per task from a workflow's own loop.
- **Administrator management.** Creating/updating/deleting dashboard
  operators is an account-administration decision for a person, the same
  category of thing as managing carrier accounts in a shipping API — not a
  step in a delivery workflow.
- **Set/get a worker's schedule.** Onfleet's schedule endpoints configure
  recurring shift blocks rather than dispatching anything, and are a
  dashboard-planning surface more than a workflow step.

## Errors

Onfleet answers `{"code": "...", "message": {"error", "message", "cause",
"request"}}` — and, on a few routes, a bare string for `message` instead
(`{"code": "MethodNotAllowed", "message": "GET is not allowed"}`). Both
shapes are handled. A `401`/`403` names that a key can be revoked after
connect time, not just at connect time; a `429` names the shared 20 req/s
budget; a `412` explains that a container was locked by a concurrent update
and should be retried serially rather than in parallel — Onfleet's own
containers doc recommends exactly that.
