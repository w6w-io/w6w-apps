# Personio

Manage employees, absences and documents, and read custom reports, through Personio's
Personnel Data API.

- **Category** — hr
- **Auth method** — `client-credentials` (Personio's own naming; the wire format is a
  custom REST call, not standard OAuth2 — see below)
- **Actions** — 16
- **Health checks** — `service` (Statuspage, "Public API" component) + ~~`quota`~~
  (declared absence) + 1 derived (`auth:client-credentials`)
- **Egress allowlist** — `api.personio.de` (the `service` check adds
  `status.personio.de` to its own hook allowlist, never to the app's)
- **Docs** — https://developer.personio.de/reference/introduction
- **OpenAPI source** — https://github.com/personio/api-docs (linked from the docs
  intro: "This page builds up on our API docs in swagger format hosted on github")
- **Status page** — https://status.personio.de

> **Everything below was verified against Personio's own OpenAPI sources on
> 2026-09-06** — `personio-auth-api.yaml` and `personio-personnel-data-api-oa3.yaml`,
> fetched directly from `raw.githubusercontent.com/personio/api-docs` — plus one
> ReadMe-hosted guide page (`/reference/authentication`) for behavior the OpenAPI
> files alone don't state. Nothing here came from a third-party integration
> directory.

## The three things most likely to cost you a day

### 1. The "client-credentials" grant is not standard OAuth2

Personio calls this a client-credentials grant, but the wire format is a plain,
custom REST call — not `grant_type=client_credentials`, no Basic-auth header:

```
POST https://api.personio.de/v1/auth
{ "client_id": "...", "client_secret": "..." }

-> { "success": true, "data": { "token": "papi-eyJ...", "expires_in": 86400 } }
```

Worse: the token is **stable for 24 hours**. Personio's Authentication guide states
it plainly — "The bearer token generated is specific to the Client ID and secret
used and remains the same, i.e. stable, for a period of 24 hours... can be used for
an indefinite number of calls in the 24 hour period... and can also be used for
parallel API calls." An integration that re-authenticates before every request gets
back the *same* token and gains nothing, while burning into the auth endpoint's own
**separate** rate limit: 150 requests/minute, throttled to 1/second for the next 60
seconds if exceeded, reset after that ("an upgrade from the v1 rate limit of 60
requests per minute"). `auth/client-credentials.ts` caches the minted token and only
re-mints on `refresh`/`test`.

The minted token also carries a `papi-` prefix and works **only** on the Personnel
Data API — "all endpoints except Auth and Recruiting." The Recruiting API needs an
entirely separate, statically-issued token (see gap #3 below).

### 2. One response wraps every field; a sibling response barely wraps any

An **Employee** resource wraps every single field:

```json
{ "first_name": { "label": "First name", "value": "Alexander", "type": "standard", "universal_id": "first_name" } }
```

A **TimeOffPeriod** (`/company/time-offs`) does NOT — its own top-level fields
(`id`, `status`, `start_date`, `time_off_type.attributes.name`, ...) are plain
scalars — **except** the embedded `employee` relationship, which reverts to the
full per-field wrapper, exactly like a standalone Employee response. Code written
against one shape and assumed to generalize to the other silently reads
`undefined`. `lib/client.ts` ships two separate unwrappers —
`flattenAttributes` for the always-wrapped Employee shape, `flattenTimeOffPeriod`
for the mixed shape — because one generic function cannot cover both correctly.

A **third** shape shows up in `/company/absence-periods` (hourly absences):
different field names entirely (`effective_duration`/`measurement_unit` instead of
`days_count`, `start`/`end` instead of `start_date`/`end_date`, `absence_type`
instead of `time_off_type`, a UUID `id` instead of an integer), plus a
`breakdowns` array with no equivalent on `TimeOffPeriod`. `List Absence Periods`
handles this third shape on its own.

### 3. Two completely different error postures for "bad credential"

A **missing** Authorization header answers **401**:
`{"success":false,"error":{"code":401,"message":"Authorization is not provided"}}`.
An **invalid or expired** token answers **403**:
`{"success":false,"error":{"code":403,"message":"Provided authorization is not valid"}}`.
Every action and the auth method's `test`/`refresh` read `error.message` from the
body rather than branching on the status code alone.

## Actions (16)

**Employees**

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-employees` | read | `GET /company/employees` |
| `get-employee` | read | `GET /company/employees/{id}` |
| `create-employee` | perform | `POST /company/employees` |
| `update-employee` | perform | `PATCH /company/employees/{id}` |
| `list-employee-attributes` | read | `GET /company/employees/attributes` |
| `get-absence-balance` | read | `GET /company/employees/{id}/absences/balance` |

**Absences**

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-time-off-types` | read | `GET /company/time-off-types` |
| `list-time-offs` | read | `GET /company/time-offs` |
| `get-time-off` | read | `GET /company/time-offs/{id}` |
| `create-time-off` | perform | `POST /company/time-offs` (form-encoded — see below) |
| `delete-time-off` | perform | `DELETE /company/time-offs/{id}` |
| `list-absence-periods` | read | `GET /company/absence-periods` (hourly absences) |

**Documents**

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-document-categories` | read | `GET /company/document-categories` |
| `upload-document` | perform | `POST /company/documents` (multipart, 60 req/min, 30MB max) |

**Custom Reports**

| Key | Type | Endpoint |
| --- | --- | --- |
| `list-custom-reports` | read | `GET /company/custom-reports/reports` |
| `get-custom-report` | read | `GET /company/custom-reports/reports/{id}` |

### `list-employees`' `updated_since` disables everything else

Personio's own reference states it directly: when `updated_since` is set, `email`,
`limit` and `offset` are silently **ignored**, pagination is disabled, and every
employee updated since that time comes back in one response. `attributes[]`
combined with `updated_since` also changes meaning — it stops projecting fields
and starts filtering by "did any of these change".

### `create-time-off` is form-encoded, unlike Create/Update Employee

`POST /company/time-offs` documents **only** `application/x-www-form-urlencoded`
— no JSON body option, unlike Create/Update Employee, which take JSON. This app's
`lib/client.ts` ships a separate `requestForm` helper specifically for this one
endpoint shape.

### `Create Time-Off`'s `skip_approval` defaults to true

Leaving it unset creates the absence **already approved**, bypassing any approval
flow configured on that absence type. Set `skipApproval: false` explicitly to
route it through the configured flow instead.

## Auth setup

1. In Personio, go to **Settings → Integrations → API Credentials** and generate a
   **Client ID** / **Client Secret** pair, scoped to the attributes and endpoints
   you need.
2. Enter them into the `client-credentials` connection. The app mints and caches
   the bearer token itself; nothing else to configure.

## Health checks

- **`service`** — reads `status.personio.de` (an Atlassian Statuspage, verified
  live 2026-09-06 as `page.name: "Personio Statuspage"`), and specifically the
  **"Public API"** component (id `xbk8k300755q`, under "Core Platform") so an
  incident in, say, Payroll or Recruiting doesn't make this app look unhealthy.
- **`quota`** — declared unavailable, `severity: informational`. Personio's own
  OpenAPI sources document only two fixed, prose-only rate limits (150/min on
  `/v1/auth`, 60/min on `/company/documents`) and no `X-RateLimit-*`/`RateLimit-*`
  response header anywhere, so there is nothing to read before a limit is hit.
- **`auth:client-credentials`** — derived automatically from the auth method's
  `test` hook, which re-mints the token (cheap — it's the same stable token for
  24 hours) and reports whether that succeeded.

## What's deliberately not covered

- **Attendances (v1) and Projects (v1)** (`/company/attendances`,
  `/company/attendances/projects`) — both carry `deprecated: true` in Personio's
  own OpenAPI file, with `x-papi-meta.deprecation.effective_from:
  "2027-01-31T23:59:59Z"` and a named successor (`/v2/attendance-periods`,
  `/v2/projects`) — but that v2 surface is **not documented anywhere** in the
  same `personio/api-docs` repository this app was built from. Rather than ship
  a soon-to-be-retired v1 surface or guess at an unpublished v2 schema, both are
  left out entirely.
- **The Recruiting API** (`personio-recruiting-api.yaml`) — a genuinely separate
  contract from the Personnel Data API this app covers: its own static
  "Recruiting API Access Token" (found under Settings → API → Access Data,
  **not** minted from `/v1/auth`), a required `X-Company-ID` header the
  Personnel Data API never uses, and — critically — no documented read-only
  endpoint of any kind (only two mutating `POST`s: create an application, upload
  a document), which leaves no safe, side-effect-free probe for an Auth `test`
  hook to call. Out of scope for this pass.
- **The Career Site XML job-postings feed**
  (`https://{company}.jobs.personio.de/xml`) — real and documented, but a
  different, unauthenticated host returning XML rather than JSON. Left out to
  keep this app to a single host and a single response format; a future app
  version could cover it as a `requiresAuth: false` action on a
  `*.jobs.personio.de` wildcard host.
- **Creating hourly absence periods** (`POST /company/absence-periods`) and
  **profile pictures** (`GET /company/employees/{id}/profile-picture/{width}`,
  which returns a binary image, not JSON) — real and documented; left out of
  this pass. `list-absence-periods` already covers the read side of hourly
  absences.
