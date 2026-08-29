# Connecteam

Manage a deskless workforce — employees, GPS time clock, shift scheduling, digital forms and task
boards — on the **Connecteam API v1**.

- **Categories** — hr, productivity, calendar
- **Auth methods** — api-key
- **Actions** — 27
- **Health checks** — 1 live (`service`) + 1 declared absence (~~`quota`~~) + the derived
  `auth:api-key`
- **Egress allowlist** — `api.connecteam.com` (the `service` check adds `connecteam.statuspage.io`
  to its own hook allowlist, never to the app's)
- **Website** — https://connecteam.com/
- **API docs** — https://developer.connecteam.com/reference
- **OpenAPI** — https://developer.connecteam.com/openapi/connecteam-api-documentation.json
- **Status page** — https://connecteam.statuspage.io/

> **Everything below was verified against Connecteam's own sources on 2026-08-29** — its
> machine-readable OpenAPI 3.1 document (discovered via the RFC 9727 API-catalog well-known file at
> `developer.connecteam.com/.well-known/api-catalog`, which links
> `openapi/connecteam-api-documentation.json`, 616,945 bytes, `info.version` `"v1"`) — and live probes
> against `api.connecteam.com` and `connecteam.statuspage.io`. Nothing here came from a third-party
> integration directory.

## The three things most likely to go wrong

### 1. Auth is a custom header, not a bearer token

The working assumption going into this build was "Bearer API key". That was wrong. Connecteam's
`APIKeyHeader` security scheme is:

```
X-API-KEY: <key>
```

— no `Authorization` header, no `Bearer ` prefix, just the raw key on its own header. Every
documented endpoint's `security` array lists `APIKeyHeader` ahead of `OAuth2`, so the key alone is a
complete way to authenticate; `auth/api-key.ts`'s `sign` hook stamps exactly this and nothing else.

Connecteam also documents a **separate, real** OAuth2 `clientCredentials` scheme
(`POST /oauth/v1/token`, trading a `client_id`/`client_secret` HTTP-Basic pair for a scoped, expiring
bearer token). It is not a decoy — it is a legitimate alternative for a partner integration that wants
scoped, revocable tokens — but this app does not implement it: the static API key already reaches
every endpoint this app calls, with no refresh machinery to build. A future version can add it as a
second Auth method without touching this one.

### 2. Two different error shapes on failure, not one

Confirmed live against `api.connecteam.com` on 2026-08-29, not inferred from the OpenAPI document
(which only declares a `200` and a generic `422`):

| Failure                          | Status | Body                                                                 |
| --------------------------------- | ------ | --------------------------------------------------------------------- |
| No `X-API-KEY` header at all       | 401    | `{"details": null, "error": "No authentication provided", "path": "/me", "request_id": "..."}` |
| A syntactically valid but wrong/revoked key | 403 | `{"detail": "Invalid API key"}`                                |
| A malformed request (422, FastAPI) | 422    | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`          |

The word `detail` names **two different shapes** — a bare string on a 403, an array of validation
objects on a 422 — and the 401 uses `error` (singular) instead. `formatConnecteamError` in
[`lib/client.ts`](lib/client.ts) reads the body's actual structure rather than guessing from the
status code, and `auth/api-key.ts`'s `test` hook reports the 401 and 403 cases as distinct, actionable
messages rather than a generic "unauthorized".

### 3. Bulk-shaped endpoints, single-record actions — and no single-user "get"

Create/update/delete for users, shifts and tasks all accept **arrays** in one call (up to 20–500
items depending on the endpoint). Every create/update/delete action in this app wraps a single record
in a one-element array or a one-id list, matching the rest of this app's one-record-per-step model —
each action's own doc comment says so.

There is also **no endpoint that fetches a single user by id**. Only `GET /users/v1/users` (a list,
narrowable with the `userIds` filter) and the bulk archive/delete exist. `user-list` with one id in
`User IDs` is the documented way to fetch one employee.

## Auth

One method: `api-key`, type `apiKey`, header `X-API-KEY` (see finding 1 above).

### The probe is `GET /me`, and it is safe by construction

`GET /me` returns exactly `{"companyName", "companyId"}` per Connecteam's own `MeResponse` schema,
confirmed live. Neither field is a secret or a scope-restricted value — Connecteam's API key is a
single, company-wide credential with no per-scope narrowing the way an OAuth2 token would have — so
there is no "correctly scoped key gets refused" failure mode to design around, unlike some
apiKey/token-per-scope APIs elsewhere in this pack. `afterConnect` reuses the same call to populate
`connectionLabel` (`Connecteam ({{companyName}})`).

`test` distinguishes the two failure shapes from finding 2 above rather than collapsing them into one
generic "invalid credential" message.

## Actions

27 actions. `resource` groups them in the editor.

| Key                        | Type    | Endpoint                                                                        |
| --------------------------- | ------- | -------------------------------------------------------------------------------- |
| `account-get`               | read    | `GET /me`                                                                         |
| `user-list`                 | search  | `GET /users/v1/users`                                                             |
| `user-create`               | perform | `POST /users/v1/users`                                                            |
| `user-update`               | perform | `PUT /users/v1/users`                                                             |
| `user-archive`              | perform | `DELETE /users/v1/users`                                                          |
| `time-clock-list`           | read    | `GET /time-clock/v1/time-clocks`                                                  |
| `clock-in`                  | perform | `POST /time-clock/v1/time-clocks/{id}/clock-in`                                   |
| `clock-out`                 | perform | `POST /time-clock/v1/time-clocks/{id}/clock-out`                                  |
| `time-activity-list`        | search  | `GET /time-clock/v1/time-clocks/{id}/time-activities`                             |
| `time-activity-create`      | perform | `POST /time-clock/v1/time-clocks/{id}/time-activities`                            |
| `time-activity-delete`      | perform | `DELETE /time-clock/v1/time-clocks/{id}/time-activities/{activityId}`             |
| `timesheet-get`             | read    | `GET /time-clock/v1/time-clocks/{id}/timesheet`                                   |
| `scheduler-list`            | read    | `GET /scheduler/v1/schedulers`                                                    |
| `shift-list`                | search  | `GET /scheduler/v2/schedulers/{id}/shifts`                                        |
| `shift-get`                 | read    | `GET /scheduler/v2/schedulers/{id}/shifts/{shiftId}`                              |
| `shift-create`              | perform | `POST /scheduler/v2/schedulers/{id}/shifts`                                       |
| `shift-update`              | perform | `PUT /scheduler/v2/schedulers/{id}/shifts`                                        |
| `shift-delete`              | perform | `DELETE /scheduler/v2/schedulers/{id}/shifts`                                     |
| `job-list`                  | search  | `GET /jobs/v1/jobs`                                                               |
| `form-list`                 | search  | `GET /forms/v1/forms`                                                             |
| `form-get`                  | read    | `GET /forms/v1/forms/{formId}`                                                    |
| `form-submission-list`      | search  | `GET /forms/v1/forms/{formId}/form-submissions`                                   |
| `form-submission-get`       | read    | `GET /forms/v1/forms/{formId}/form-submissions/{submissionId}`                    |
| `taskboard-list`            | read    | `GET /tasks/v1/taskboards`                                                        |
| `task-list`                 | search  | `GET /tasks/v1/taskboards/{boardId}/tasks`                                        |
| `task-create`               | perform | `POST /tasks/v1/taskboards/{boardId}/tasks`                                       |
| `task-update`               | perform | `PUT /tasks/v1/taskboards/{boardId}/tasks/{taskId}`                               |

Scheduling uses the **v2** shifts surface. Connecteam documents a parallel v1 shifts API under
`/scheduler/v1/schedulers/{id}/shifts`; v2 is the current one (adds `assignedUserIds` as a first-class
filter and a richer bulk-update response) and this app builds only that form.

Array-valued filters (`userIds`, `jobIds`, `assignedUserIds`, `activityTypes`, …) are exposed as
comma-separated string params and serialized on the wire as **repeated query keys**
(`userIds=1&userIds=2`) — the OpenAPI 3.1 default (`style: form, explode: true`) for every array
query parameter Connecteam declares, and also what its FastAPI backend expects. A comma-joined single
value is silently treated as one filter that matches nothing; see `lib/client.ts` for the
serialization and a pinned test.

## Health checks

One live check plus one declared absence, and the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

**(a) Does the host even resolve?** `status.connecteam.com` and `connecteamstatus.com` both fail to
resolve entirely; `connecteam.statuspage.io` answers `200` with 5,753 bytes of Statuspage v2 JSON.

**(b) Does the page describe *this* product?** Yes —
`"page": {"id": "rm6hp617s26d", "name": "Connecteam", "url": "https://connecteam.statuspage.io"}`.

**(c) Does the component vocabulary match this app's own surface?** Yes — of its 17 components,
`Job Scheduler`, `Time Clock`, `Task Management` and `Forms` map directly onto this app's own action
groups, which is the strongest evidence the status page and this API describe the same product.

All 17 components carry `"group": false` — there is no group/child hierarchy to collapse, unlike
pages that mix per-region or per-service groups into one list. Severity is left at the `degraded`
default: Connecteam is SaaS-only, so an incident here is evidence about every Connection this app can
hold.

### ~~`quota`~~ — a declared absence, at `informational` severity

Checked live on 2026-08-29, both signed (a syntactically plausible fake key) and unsigned: **no**
`X-RateLimit-*`, `RateLimit-*` or `Retry-After` header of any kind on either response. A
case-insensitive search of the entire 616,945-byte OpenAPI document for "rate limit" returns zero
matches, and the public developer docs describe no metered ceiling for the API-key auth path.

`severity: "informational"` is load-bearing here: an `unavailable` entry always reports `unknown`,
`unknown` outranks `ok` in the roll-up, and at any other severity this would pin the app's verdict at
`unknown` forever.

## Deliberately not covered

Connecteam's API has 98 documented operations across roughly 20 feature areas. This app covers 27,
chosen for the core surfaces named in scope — employees, time clock, scheduling, forms and tasks —
plus jobs (needed to tag shifts and time entries). What is left out, and why:

- **OAuth2 client-credentials auth** (`POST /oauth/v1/token`) — real and documented, but requires
  token-exchange/refresh machinery this app does not build. See finding 1 above.
- **Sub-resource CRUD around the core surfaces** — user custom fields and their options, smart
  groups and segments, admin promotion, user notes/payslips/performance, pending-user invites, shift
  layers and custom fields, shift auto-assign, schedule unavailability, pay rate policies and
  assignments, geofences, manual-break clock-in/out, breadcrumbs GPS reports, and lock-days. All real,
  documented endpoints; left out to keep this build to the primary read/write path per surface rather
  than every administrative corner of it.
- **Time off** (`/time-off/v1/**`) and **pay rates** (`/pay-rates/v1/**`) — real, documented surfaces
  adjacent to time clock and scheduling; omitted for scope, worth adding in a follow-up.
- **Chat** (`/chat/v1/**`) — create conversations and post messages; a real, documented surface
  omitted for scope.
- **Sales** (`/sales/v1/**`), **daily notes** (`/daily-info/v1/**`), **onboarding**
  (`/onboarding/v1/**`), **assets** (`/assets/v1/**`) and **publishers** (`/publishers/v1/**`) —
  each its own smaller feature area, omitted for scope.
- **Attachments** (`/attachments/v1/**`) — file upload/download plumbing that supports several of the
  areas above (profile pictures, task descriptions, form submissions); omitted alongside the actions
  that would consume it.
- **Webhooks** (`/settings/v1/webhooks`) — subscribing to Connecteam's own push events. This app is
  action-only today; a future version could add it as a `TriggerDefinition`.
- **Form question/dropdown-option management** — editing a form's own schema, as opposed to reading
  it and its submissions.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` wraps `https://connecteam.com/logo_192_by_192.png`, downloaded verbatim on
2026-08-29 — 4,164 bytes, 192×192 RGBA PNG, `image/svg+xml` container around a base64 `image/png`.
This is the mark connecteam.com's own `/manifest.json` (`icons[0].src`) declares as its app icon.
Connecteam publishes no SVG mark, and its linked `<link rel="icon">` favicon.ico is a lower-resolution
48×48 raster with no larger PNG variant reachable at any of the common paths — the site's own
`apple-touch-icon.png` exists but answers `200` with **zero bytes**, a placeholder rather than a real
asset. This follows the pack's existing precedent for a vendor with no vector mark: wrapping the
vendor's own raster asset in an `<svg><image>` container rather than hand-tracing a vector that does
not exist (see `apollo`, `blandai`, `dialpad`, `gorgias`, `kustomer`). It is not run through
`_tools/icon-normalize.ts`, matching those apps: that tool re-frames genuine vector artwork onto the
pack's shared 100×100 canvas, and a wrapped raster already fills its own square.

## Layout

```
connecteam/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ConnecteamClient, the two error shapes, query serialization
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-key.ts               # X-API-KEY header: sign, test, afterConnect
├── actions/                     # one file per action (27)
├── health/
│   ├── service.ts               # connecteam.statuspage.io
│   └── quota.ts                 # declared absence, informational
├── assets/icon.svg              # vendor's own PNG mark, wrapped as SVG
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
