# Cursor

Manage a Cursor team programmatically: members, usage and spend, repo context blocklists,
Enterprise billing groups, and model-access policy — over Cursor's **Admin API**.

- **Categories** — developer-tools, ai, finance
- **Auth methods** — api-key (HTTP Basic, key as username, empty password)
- **Actions** — 24
- **Health checks** — 1 (`service`, capped at `degraded`) + the derived `auth:api-key`
- **Egress allowlist** — `api.cursor.com` (the `service` check adds `status.cursor.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://cursor.com/
- **API docs** — https://cursor.com/docs/account/teams/admin-api
- **Status page** — https://status.cursor.com/

> **Everything below was verified against Cursor's own docs on 2026-09-05** — the Admin API
> reference (`cursor.com/docs/account/teams/admin-api`) and the shared API overview
> (`cursor.com/docs/api`, auth/rate-limits/error-taxonomy), both fetched live, plus a live probe of
> `status.cursor.com/api/v2/summary.json`. Nothing here came from a third-party integration
> directory or from another AI-vendor's admin API.

## Scope: this is the *Admin* API, not the editor

Cursor the AI code editor has **no public API** — there is nothing to wrap there. What Cursor
*does* publish is a small **Admin/Teams API** for Business and Enterprise plans: team management,
usage/spend reporting, and policy configuration. That is the entire surface this app covers.
`docs/api` lists four sibling surfaces this app deliberately does **not** touch: the Analytics API,
the AI Code Tracking API, the Cloud Agents API, and the Organization API (org-wide actions across
multiple teams — this app is team-scoped). Cursor documents no OAuth flow for any of them; the API
key is the entire authentication story.

The Admin API itself is genuinely small — it is a team-management surface, not a general product
API — so this app is small on purpose. It covers every endpoint the reference documents, nothing
padded in. Two sub-surfaces (`model-access/*` and `user-spend-limits` bulk) are themselves marked
**preview** by the vendor; they are implemented (fully documented, with worked examples) but say so
in their own action descriptions.

## The three things most likely to cost you a day

### 1. Basic auth, key as the username — not a bearer token

Every documented example is:

```
curl https://api.cursor.com/teams/members -u YOUR_API_KEY:
```

The key is the **username**, the **password is empty** — note the trailing colon with nothing after
it. `docs/api` separately documents a `Bearer <key>` scheme, but it is scoped to the *Cloud Agents*
API, a different surface; every Admin API example uses Basic. Get the colon wrong (`-u YOUR_API_KEY`
with no colon) and most HTTP clients prompt for a password instead of sending an empty one.

### 2. Scoped keys — and this app needs the broad one

Cursor API keys carry scopes: `admin:*`, `models:read`, `models:*`, and a generic `read:*`. The doc
states the requirement only piecemeal — explicitly for the `model-access/*` routes ("Reads require
`models:read`/`models:*`. Writes require `models:*`. Keys with `admin:*` work for both. Generic
`read:*` keys cannot call these routes"), and separately names `admin:*` as the **required scope**
for the Admin API in its own key-setup walkthrough. Every action in this app therefore expects an
`admin:*` key. A `models:*`-only key will authenticate fine (the connection's `test` hook will pass)
and then be refused with `403` on every action outside `model-access-*`.

### 3. Three different error-body shapes in the same API

`docs/api#common-error-responses` documents one shape, `{"error": "<Title>", "message": "<detail>"}`,
for the general 4xx/5xx taxonomy. Two corners of the *same* Admin API disagree, confirmed against
the vendor's own documented response bodies:

| Route | Documented error body |
| --- | --- |
| Most routes | `{"error": "Unauthorized", "message": "Invalid API key"}` |
| `POST /teams/remove-member` | `{"error": "User is not a member of this team"}` — the message **is** the `error` field, no separate `message` |
| `model-access/*`, and the `429` rate-limit response | `{"code": "error", "message": "Rate limit exceeded"}` — a `code` field instead of `error` |

[`lib/client.ts`](lib/client.ts)'s `formatCursorError` reads whichever of `message` / `error` /
`code` is actually a populated string, rather than assuming one fixed shape — the naive
`body.error ?? body.message` reads back `undefined` for a real, well-formed 400 from
`remove-member`.

## One endpoint that changes response *shape*, not just content

`daily-usage-get` (`POST /teams/daily-usage-data`) is the one action in this app where the vendor's
own examples show two genuinely different response shapes from the same endpoint, driven entirely
by which optional params are set:

- **Neither `page` nor `pageSize` set:** only users **active** during the range come back, no
  `pagination` envelope, no `isActive` field (every row is active by construction).
- **Both set:** **every** team member with a membership during the range comes back — including
  inactive ones with all-zero counters — plus an `isActive` field per row and a `pagination` object.

So `page`/`pageSize` are sent together or not at all (`actions/daily-usage-get.ts`); sending only
one is not a documented combination.

## Health check

`status.cursor.com` is a real, live Atlassian Statuspage — verified 2026-09-05: `200`,
`application/json`, 2,693 bytes (far below either known unclaimed-host signature: an unclaimed
`*.statuspage.io` is ~127,700 B of HTML, an unclaimed `*.instatus.com` is ~216,800 B), and its
`page` object self-identifies as `"name": "Cursor"`. But its eight components — **Automations,
Review Agents, CLI, Cloud Agents, cursor.com, IDE, Origin, Grok Bot** — name no "API" or
`api.cursor.com` component; the closest candidates (Automations, Cloud Agents) describe the
*Cloud Agents* product, a different surface from this app's Admin API. Per `HEALTHCHECKS.md`, a
status page is not automatically a statement about the dependency an app actually calls, so
`health/service.ts` reads the page but **caps its verdict at `degraded`** — real evidence that
something at Cursor is wrong, never a claim that the Admin API specifically is down. (Same shape as
`apps/grain` and `apps/housecallpro` in this pack.)

There is no documented rate-limit-remaining header or quota endpoint anywhere in the Admin API, so
no `quota` check is declared — Cursor states rate limits as fixed numbers per endpoint (20/60/250
requests per minute), not as headroom a caller can read back.

The credential-liveness check is the auth method's own `test` hook (`GET /teams/members`, projected
automatically as `auth:api-key`) — the doc's own canonical example, needs a credential, and returns
nothing secret.

## Actions

| Group | Actions |
| --- | --- |
| Members | `members-list`, `member-remove`, `audit-logs-list` |
| Usage & spend | `daily-usage-get`, `spend-get`, `usage-events-list`, `user-spend-limit-set`, `user-spend-limits-bulk-set` (preview) |
| Repo context blocklists | `repo-blocklist-list`, `repo-blocklist-upsert`, `repo-blocklist-delete` |
| Billing groups (Enterprise) | `group-list`, `group-get`, `group-create`, `group-update`, `group-delete`, `group-members-add`, `group-members-remove` |
| Model access (preview) | `model-access-configuration-get`, `model-access-configuration-update`, `model-access-providers-list`, `model-access-provider-update`, `model-access-provider-models-list`, `model-access-model-update` |

Two response shapes in the model-access sub-surface (`model-access-provider-update`'s and
`model-access-provider-models-list`'s) are not given a worked example in the vendor's own docs —
only the request and the `409`/`400` error cases are. Those two actions return Cursor's response
body unmodified rather than a shape invented for them; everything else in this app has a verified
example response behind its `output` fields.

## Development

```bash
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt         # format (lineWidth 100, semicolons, double quotes)
deno task test         # unit tests — 98 assertions across every action, auth, health check and the client
deno task validate     # @w6w/validator conformance audit
```
