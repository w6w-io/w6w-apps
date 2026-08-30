# Teamwork

Manage Teamwork projects, tasks, task lists, milestones and time logs.

- **Categories** — project-management
- **Auth methods** — api-key
- **Actions** — 17
- **Egress allowlist** — `*.teamwork.com`
- **Website** — https://www.teamwork.com
- **API docs** — https://apidocs.teamwork.com

## Actions

| Resource | Actions |
|---|---|
| project | list, get, create, update, delete |
| task | list, get, create, update, delete |
| tasklist | list, create |
| milestone | list, create |
| timelog | list, create |
| person | list |

Deliberately absent: boards/columns/cards (a separate Kanban surface),
messages/notebooks (content objects, not project-management primitives),
workflows/stages, and file attachments — out of scope for this app's action
budget. No webhook/trigger surface — that is a Trigger, not an Action.

## Two API generations, on purpose

Reads, task updates and time-tracking use the modern V3 endpoints
(`/projects/api/v3/...`). Project, task-list and milestone
create/update/delete only exist as the older V1 endpoints
(`/projects.json`, `/projects/{id}/tasklists.json`, `/projects/{id}/milestones.json`,
...) — confirmed against the OpenAPI document apidocs.teamwork.com itself
serves from its own "Download Swagger" link (`/api/oas/download?slug=teamwork&api_version=endpoints-by-object`),
whose `paths` carry no shared prefix. Missing this split is the single easiest
way to get a 404 building against this API — every action's own comment says
which generation it targets.

One V3 endpoint is also inconsistent with the rest of the pack: `GET tasklists`
(list and get-one) is documented with **no `.json` suffix**
(`/projects/api/v3/tasklists`), unlike every other V3 endpoint in this app.
Verified on the docs page's own title, not assumed.

## Per-account host

Every Teamwork account lives on its own subdomain —
`{yourSiteName}.teamwork.com` — confirmed against
apidocs.teamwork.com/guides/teamwork/authentication's own curl examples. A
manifest cannot enumerate those, so `w6w.network.allow` declares the wildcard
`*.teamwork.com`; the site name is collected once as an Auth field (identifies
the account, so it belongs to the Connection) and echoed onto the connection's
`display` by `afterConnect`, exactly like `freshdesk`'s identical `domain`
field.

**Unlike Freshdesk, an unauthenticated request to a nonexistent Teamwork
subdomain does NOT 404.** Verified live 2026-08-30: a deliberately bogus
subdomain (`intentionally-bad-subdomain-w6wtest.teamwork.com`) answers the
exact same `401 {"errors":[{"title":"unexpected error","detail":"401: Not
authorized"}]}` as a real site with a wrong API key — `*.teamwork.com` fronts
every request with the same auth gate before it knows whether the account
exists. There is no unauthenticated signal this app can probe that
distinguishes "wrong site name" from "bad credential", so — unlike
`freshdesk/health/domain.ts` — no separate `dependency`-kind health check is
declared here; the derived `auth:api-key` check is the only signal for either
cause, and its message says so.

## Auth scheme

Basic auth with the API key as the username. Verified against
apidocs.teamwork.com/guides/teamwork/authentication: `Authorization: Basic
base64({API_KEY or username}:password)`. There is no real password for the
API-key case — this app uses the literal `X` placeholder, the same convention
`freshdesk`'s identical scheme documents (there is no dedicated Teamwork PAT
password format published; `X` is what every integration built against this
scheme uses).

## Pagination

`page` / `pageSize` (default 50, max 500 on most V3 list endpoints). Verified
against apidocs.teamwork.com/guides/teamwork/how-does-paging-work. Responses
carry both the legacy `x-page` / `x-pages` / `x-records` headers and a V3
`meta.page.{pageOffset,pageSize,count,hasMore}` object; this app surfaces the
latter as an `output.meta` field on every list action.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left.

### Is the vendor up?

**Service status** — <https://status.teamwork.com> (Atlassian Statuspage,
verified live 2026-08-30: `page.name: "Teamwork.com"`). Its `components.json`
groups a "Teamwork Projects" component (with US/EU region children)
alongside unrelated Teamwork Desk, Chat, Spaces and CRM components — this app
covers Projects only, so `health/service.ts` reads just that group's own
indicator rather than the whole page's rollup, which would report a Desk or
Chat outage as an outage here.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

The `api-key` auth method probes:

```
GET /projects/api/v3/people.json?pageSize=1
```

The cheapest, no-special-scope read available: every account has at least one
person (the caller), and the response never echoes the credential.

### Do we have quota left?

`X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining` and `X-Rate-Limit-Reset`
response headers — verified against
apidocs.teamwork.com/guides/teamwork/rate-limit. The limit is global per
account (150 requests/minute up to the Grow plan, 300/minute on Scale), and a
live unauthenticated 401 was confirmed to carry NONE of these headers, so
`health/quota.ts` reads them off the same signed people probe the credential
check uses.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` (Statuspage, "Teamwork Projects" group only) |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

No separate `dependency`-kind check is declared — see "Per-account host"
above for why an unauthenticated per-site probe cannot say anything here that
`auth:api-key` doesn't already say.

## Findings that would cost someone a day

1. **No 404 for a nonexistent account.** Every subdomain of `*.teamwork.com`
   answers the same `401` regardless of whether the account exists — see
   "Per-account host" above. A domain-liveness check modeled on Freshdesk's
   would be meaningless here.
2. **Two API generations, silently mixed.** `POST /projects.json`,
   `PUT/DELETE /projects/{id}.json`, `POST /projects/{id}/tasklists.json` and
   `POST/PUT /projects/{id}/milestones.json` (and `PUT /milestones/{id}.json`)
   are V1 endpoints living at the host root — NOT under `/projects/api/v3/`
   like everything else. Assuming a uniform prefix from the guide's own V3
   curl examples is the fastest way to get a 404 against this API.
3. **`GET /projects/api/v3/tasklists` has no `.json` suffix**, unlike every
   other V3 list endpoint documented — confirmed on the docs site itself, not
   an inference.
4. **Task and milestone field values are under-specified.** `task.priority`
   is typed as an opaque nullable string with no enum in Teamwork's own
   OpenAPI document; this app leaves it as free text (hint: `low` / `medium`
   / `high`, the value set Teamwork's own V1 task-list-template body
   documents for the equivalent `priorityText` field) rather than guessing a
   hard-coded list that could reject a value the API actually accepts.

---

Researched and endpoint-verified 2026-08-30 against apidocs.teamwork.com
(guides + the `endpoints-by-object` OpenAPI document served from its own
"Download Swagger" link) and live probes of `*.teamwork.com` and
`status.teamwork.com`. Status surfaces move; re-check if a probe starts
failing for everyone at once.
