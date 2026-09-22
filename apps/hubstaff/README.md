# Hubstaff

Read the organizations, projects, members, teams, clients, tasks, activities and timesheets that
make up a **Hubstaff** organization (time tracking and workforce management), and write back
manual time entries, tasks, and timesheet approval status.

- **Categories** — project-management, hr, productivity
- **Auth methods** — bearer (Organization access token)
- **Actions** — 19
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:organization-access-token`
- **Egress allowlist** — `api.hubstaff.com` (the `service` health check adds
  `status.hubstaff.com` to its own hook allowlist, never to the app's — no action ever reaches it)
- **Website** — https://hubstaff.com/
- **API docs** — https://developer.hubstaff.com/ (rendered guides) and
  https://api.hubstaff.com/v2/docs (the canonical OpenAPI 2.0 document — 510,300 bytes, 135
  paths, 132 definitions)
- **Status page** — https://status.hubstaff.com/

> **Verified against Hubstaff's own sources on 2026-09-22** — the OpenAPI document above, the
> rendered reference pages under `developer.hubstaff.com` (Authentication, Pagination & rate
> limits, HTTP status codes), and live probes against `api.hubstaff.com` and
> `status.hubstaff.com`. Nothing here came from a third-party integration directory or a sibling
> app's guess.

## Auth

Hubstaff's API accepts three credential kinds. This app implements only the third:

1. **Personal access tokens (PAT)** — the string you're given is a *refresh* token, not an
   access token: every call needs a prior exchange at `account.hubstaff.com` for a 24-hour access
   token, and each refresh rotates the refresh token too ("replace what you have on disk on every
   refresh"). Stateful, rotating, and a second host. Out of scope for this build.
2. **OAuth applications** — Authorization Code + PKCE through a browser sign-in. There is no
   interactive user flow anywhere in this app. Out of scope.
3. **Organization access token** (what this app uses) — a long-lived secret prefixed `hsoat_`,
   created once by an owner/manager/Manage-IT member under **Settings → Organization → API
   tokens** in the Hubstaff app and assigned to an existing member. Sent directly as
   `Authorization: Bearer hsoat_...` — no exchange, no refresh, no second host. It authenticates
   as the member it was assigned to, with that member's own role and access. The secret is shown
   once at creation and cannot be retrieved again.

The credential probe is `GET /v2/organizations` ("the organizations I'm an active member of").
Its response (`{"organizations": [...]}`) carries organization identity only — no token, no
secret — and it's the cheapest call every assignee role can reach (unlike a write endpoint, which
a `user`-role token would be refused on).

**Validity is judged from the response body, never the status code alone.** Hubstaff answers two
structurally different `401`s, both reproduced live on 2026-09-22:

| Probe | Body |
| --- | --- |
| No `Authorization` header | `{"code":"not_authorized","error_code":10001,"error":"unauthorized","error_description":null}` |
| `Bearer hsoat_<garbage>` | `{"error":"invalid_token","error_description":"The access token provided is expired, revoked, malformed or invalid for other reasons."}` |

The second shape carries no `code`/`error_code` at all — only the OAuth-style `error` slug,
mirrored in `WWW-Authenticate`. See [`auth/organization-access-token.ts`](auth/organization-access-token.ts)
and [`lib/client.ts`](lib/client.ts) for the full classification.

## Actions (19)

| Resource | Actions |
| --- | --- |
| Organization | List, Get |
| User | Get current user (`me`), Get by id |
| Project | List, Get |
| Member | List |
| Team | List, Get |
| Client | List, Get |
| Task | List, Get, Create |
| Time entry | Create (write-only — see below) |
| Timesheet | List, Update status |
| Activity | List, List by project |

### Not covered

Hubstaff v2 exposes roughly 40 resource families; this build covers the read surface a
time-tracking integration typically needs plus the three writes the API actually offers, and
deliberately leaves the rest out rather than shipping a half-verified action:

Attendance schedules/shifts, audit log entries, budgets, client/team invoices, holidays, ignored
user matches/patterns, insights, integrations, invites/invite links, job site visits, job sites,
job types, limits, locations, manual time requests, member limits, network locations, notes,
overtime policies, rates, screenshot settings, screenshots, smart notification rules/notifications,
time edit logs, time off balances/policies/requests, tool categories/classifications/usages,
tracking states, unusual activities, webhooks. Add any of these against the OpenAPI document at
https://api.hubstaff.com/v2/docs if a workflow needs them.

## Notable findings

1. **Time entries have no read.** The `time_entries` tag in the OpenAPI document has exactly one
   operation — create. Timesheets are Hubstaff's own "aggregate approval records ... not
   individual time entries", and activities are separate 10-minute tracked blocks. A workflow
   that needs "hours logged on project X" reads timesheets or activities, not time entries.
2. **Pagination is a cursor the schema doesn't declare.** List endpoints take `page_start_id`
   (default `0`) and `page_limit` (default `100`, max `500`); the prose guide promises a
   `pagination.next_page_start_id` in the response, but no list response schema in the OpenAPI
   document actually declares a `pagination` field, and the document declares no response headers
   anywhere either. Every list action here returns one page and documents the cursor explicitly
   rather than auto-following it.
3. **Rate-limit headroom could not be confirmed on the wire.** The docs promise
   `X-Rate-Limit-Limit` / `X-Rate-Limit-Remaining` / `X-Rate-Limit-Reset` response headers (120
   req/min per token by default, lower on activities/screenshots), but neither live `401` probe
   taken during research carried them, and an authenticated response wasn't available to check.
   The `quota` health check reads them if present and reports `unknown` (informational, never
   blocking) if not.

## Health checks

- **`service`** (informational) — reads the `API & Mobile` component of
  `status.hubstaff.com/index.json` (a real Better Stack page for Hubstaff's parent entity,
  Netsoft Holdings, LLC), not the page's blanket `aggregate_state`, which also rolls up the
  website, dashboard, Tasks and Talent products.
- **`quota`** (informational) — request-rate headroom from the `X-Rate-Limit-*` headers on a
  cheap `GET /v2/organizations`, `unknown` if the headers aren't present (see finding 3 above).
- **`auth:organization-access-token`** (derived) — the credential-liveness probe described above.
