# Salesloft

Manage Salesloft people, accounts, cadences, cadence enrollment, calls, notes, tasks and users
through the v2 REST API.

- **Categories** — crm, communication
- **Auth methods** — api-key, oauth2
- **Actions** — 26
- **Egress allowlist** — `api.salesloft.com`
- **Website** — https://salesloft.com
- **API docs** — https://developers.salesloft.com/docs/api/

## API verification

Base URL, auth flow, every endpoint path and every field name below were confirmed against
`developers.salesloft.com`'s live pages: the top-level category pages (`/docs/api/<resource>/`)
render server-side and state the HTTP method, path, one-line description and response status
codes verbatim (e.g. `POST /v2/accounts` — *"Creates an account. 'domain' must be unique on the
current team."*). Those pages' request/response parameter panels, however, hydrate **client-side**
from a schema this environment could not execute headlessly (confirmed against an archived
snapshot too — same skeleton, no headless-fetchable JSON). Field-level shapes (which body params
exist, their types and descriptions) were therefore cross-checked against a community-maintained
OpenAPI mirror explicitly derived from Salesloft's own hosted spec document (`x-origin` cites
`https://developers.salesloft.com/v2_api_def.json`, no longer public but attributed there), and
every description string pulled from it was spot-checked word-for-word against the corresponding
live doc page (e.g. the `/v2/accounts` create description above matches exactly). The mirror uses
an older `.json`-suffixed path convention (`/v2/accounts.json`) that the current docs no longer
show — paths in this app follow the **live, suffix-less** convention (`/v2/accounts`), confirmed
directly against the current rendered pages, not the mirror.

The `data`-envelope response shape (`{"data": …}`, with `metadata.paging` on list endpoints) is
not directly observable either, for the same client-rendering reason. It is corroborated by a
real, published Salesloft API client (`node-salesloft`) whose every method reads `response.data`
off the raw HTTP body before returning it — see `lib/client.ts` for the exact citation. If this
turns out to be wrong, `SalesloftClient.request` is the only place that needs to change.

## Actions

Twenty-six actions across Salesloft's most-used v2 resources, built on
`https://api.salesloft.com/v2`.

| Resource | Actions |
|---|---|
| Person | create, get, list, update, delete |
| Account | create, get, list, update, delete |
| Cadence | list, get |
| Cadence Membership | create (enroll), list, get, delete (remove) |
| Call | create (log), list |
| Note | create, list |
| Task | create, list, update, delete |
| User | list, get |

Deliberately out of scope:

- **`POST /v2/activities`** (the generic activity-log endpoint) — it requires an `action_id` or
  `task_id` sourced from Salesloft's own cadence-step/action machinery, which no action in this
  app exposes, so it could not be wired to anything a workflow could actually supply. `call-create`
  (`POST /v2/activities/calls`) covers the one activity type with its own dedicated, self-contained
  create endpoint.
- **Email activity** — Salesloft syncs sent/received email into a person's timeline from a
  connected mailbox; there is no "create an email activity" endpoint to call directly.
- **Bulk jobs, cadence imports/exports, conversation recordings** — async-job and binary-stream
  surfaces, out of shape for a single request/response Action.
- **CRM-sync configuration** (custom fields, CRM activity fields, external ID mapping) — setup
  surfaces a workflow does not typically touch at run time.

## Auth

Both methods sign identically — `Authorization: Bearer <token>` — confirmed against
developers.salesloft.com/docs/platform/api-basics/api-key-authentication (which states the header
format explicitly) and the OAuth introduction page; only the token's provenance differs.

- **api-key** (`apiKey`, `in: header`) — a personal key from *Salesloft Account → Your
  Applications → API Keys*, of the form `ak_<64-hex>`. Salesloft's own docs state this method is
  "exclusively for customers" — a partner building an integration for other Salesloft accounts is
  directed to OAuth instead.
- **oauth2** — a public authorization-code flow against a Salesloft OAuth application registered
  on this w6w installation (`accounts.salesloft.com/oauth/applications`). The authorize/token
  endpoints live on `accounts.salesloft.com`, a different host from the `api.salesloft.com` egress
  allowlist — added to the auth hook's allowlist implicitly, so it is not restated in
  `network.allow`. The scope list is trimmed to what this app's actions need, out of the ~40 scopes
  Salesloft's OAuth registration exposes.

Both methods `test` (and `afterConnect`) against `GET /v2/me`, which returns the authenticated
user's own profile — never the credential itself, so liveness is provable without an echo risk.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — a real Atlassian Statuspage, confirmed live 2026-08-29
(`status.salesloft.com/api/v2/summary.json`). Its component list mixes Salesloft's own
infrastructure ("Salesloft Web Application", "VoIP Provider") with a dozen third-party
integrations it also reports on (Salesforce, Zoom, LinkedIn, MS Outlook, Drift, Hubspot, …). The
page-level indicator folds all of those together, so the check ignores it for `state` and instead
takes the worst of just the two Salesloft-owned components — a Zoom outage should never make this
app report Salesloft itself as down. Every component (including the third-party ones) is still
reported in `components` for visibility.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself. Both auth methods probe:

```
GET /v2/me
```

The authenticated user's own profile — free, scope-free, and never echoes the credential back.

### Do we have quota left?

Salesloft rate-limits on a **cost-per-minute, per-TEAM** basis (not per credential — another
integration on the same team spends the same budget), documented at a default of 600 cost/minute
that Salesloft states it can raise or lower per customer or per team without notice. Two response
headers carry a live reading: `x-ratelimit-remaining-minute` (requests left in the current window)
and `x-ratelimit-endpoint-cost` (the cost of the request just executed) — confirmed against
developers.salesloft.com/docs/platform/api-basics/rate-limits, 2026-08-29. No header states the
total allowance, so `limit` is left unset rather than hardcoding the 600 default, which the same
page says can silently change for this credential's own team. Probed with the same `GET /v2/me`
call the auth `test` hooks use.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-29. Status surfaces and rate-limit defaults move;
re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
