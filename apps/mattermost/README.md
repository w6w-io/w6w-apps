# Mattermost

Posts, threads, search, channels and members on the **Mattermost REST API v4**, against Mattermost
Cloud **and** self-hosted servers alike.

- **Categories** — communication, productivity
- **Auth methods** — access-token
- **Actions** — 13
- **Health checks** — 3 (`service`, `instance`, `quota`) + the derived `auth:access-token`
- **Egress allowlist** — `*` (see below — the server is per-connection)
- **Website** — https://mattermost.com/
- **Source repository** — https://github.com/mattermost/mattermost
- **API docs** — https://api.mattermost.com/

> **Everything below was verified against Mattermost's own sources on 2026-08-11** — its OpenAPI
> source (`mattermost/mattermost-api-reference`, `v4/source/*.yaml`, the files `api.mattermost.com`
> is generated from) plus live probes against `community.mattermost.com`, running **server 11.11.0**.
> Nothing here came from a third-party integration directory.

## The five things most likely to go wrong

### 1. A post list is `{order, posts}`, not an array

```json
{ "order": ["p3", "p1"], "posts": { "p1": {…}, "p3": {…} }, "next_post_id": "", "has_next": false }
```

`posts` is a **map keyed by post id**; `order` is the array of ids in display order.
`Object.values(posts)` gives you the posts in whatever order the JSON happened to serialise — the
single most common way to misread this API. Every listing action here returns the envelope whole so
`order` survives.

### 2. `/api/v4/system/ping` is unauthenticated

Verified on the wire: with **no** `Authorization` header it answers `200 {"status":"OK", …}`. That
disqualifies it as the credential probe — a connection whose credential never got attached would sail
past it. It is exactly right for the *other* question, so it is what the `instance` health check
uses, unsigned.

The credential probe is `GET /api/v4/users/me`, which needs a credential, needs no other permission,
and returns no token.

### 3. Editing a post must go through `/patch`

Mattermost has two update endpoints:

| Endpoint | Behaviour |
| --- | --- |
| `PUT /api/v4/posts/{id}` | **Replaces** the post — expects a whole post object |
| `PUT /api/v4/posts/{id}/patch` | Applies only the fields present |

`post-update` uses `/patch`, so editing a message cannot silently blank the post's files or props.
`tests/index.test.ts` pins it.

### 4. Threads are one level deep, and `root_id` is always the *root*

Replying to a reply still takes the root post's id. Passing a reply's id attaches the message to that
reply's thread rather than creating a nested one — Mattermost has no nested threads.

### 5. Rate-limit headers exist, but are off by default

Mattermost emits `X-Ratelimit-Limit` / `-Remaining` / `-Reset` **when rate limiting is enabled** in
the System Console (`RateLimitSettings.Enable`), which is off by default. Verified: a live request to
`community.mattermost.com` returned `x-request-id` and `x-version-id` and no rate-limit header at
all. That is why `quota` here is a *live* check at `informational` severity rather than a declared
absence — see below.

## Auth

One method: a **personal access token** or a **bot token**, sent as `Authorization: Bearer …`. Both
use the same header and neither expires.

The same `Bearer` scheme also carries a **session token** from `POST /api/v4/users/login`, which
*does* expire. That is deliberately not implemented: `sign` is network-less, so a credential that has
to be fetched before it can be attached cannot be refreshed from there, and a session token would
expire underneath a Connection that still looks healthy.

Personal access tokens must be enabled in the System Console (**Integrations → Integration
Management → Enable Personal Access Tokens**). A bot account is usually the better choice for
automation: it is revocable on its own and does not act as a person.

`afterConnect` publishes the server origin, host, the acting user's id/username/roles, and the server
version from the `X-Version-Id` header. It deliberately does **not** publish the user's `email` or
`auth_data` — the first belongs to a person rather than the integration, the second is their
identifier at an external identity provider, and a Connection's display block is shown wherever the
Connection is.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `post-create` | perform | `POST /api/v4/posts` |
| `post-get` | read | `GET /api/v4/posts/{id}` |
| `post-update` | perform | `PUT /api/v4/posts/{id}/patch` |
| `post-delete` | perform | `DELETE /api/v4/posts/{id}` |
| `posts-for-channel` | search | `GET /api/v4/channels/{id}/posts` |
| `post-thread` | read | `GET /api/v4/posts/{id}/thread` |
| `post-search` | search | `POST /api/v4/teams/{id}/posts/search` |
| `channel-get-by-name` | read | `GET /api/v4/teams/name/{team}/channels/name/{channel}` |
| `channel-create` | perform | `POST /api/v4/channels` |
| `channel-direct-create` | perform | `POST /api/v4/channels/direct` |
| `channel-member-add` | perform | `POST /api/v4/channels/{id}/members` |
| `channel-members-list` | search | `GET /api/v4/channels/{id}/members` |
| `channels-for-user` | search | `GET /api/v4/users/{user}/teams/{team}/channels` |

### Notes on individual actions

**Start at `channel-get-by-name`.** Everything else needs a `channel_id`, and nobody has one — what a
person has is a URL, `https://mattermost.example.com/acme/channels/town-square`, whose two path
segments are exactly that action's two parameters. Both are **URL handles**, not display names:
`town-square`, not "Town Square".

**`channel-direct-create` sends a bare array.** Its body is `["u1", "u2"]` — not an object — per the
vendor's schema (`type: array, minItems: 2, maxItems: 2`). One of the two ids must be the
authenticated user. It is idempotent by design: a DM channel between a given pair is a singleton, so
it is safe to call before every message instead of storing the id.

**`post-search`'s modifiers live inside the query.** `from:someusername` and `in:somechannel` are part
of `terms`, and `in:` takes the channel's URL handle. `is_or_search` is required by the schema with no
server default; this action always sends it, defaulting to `false` (AND). Its `page`/`per_page` are
honoured **only on servers running Elasticsearch** — the vendor's own note — so a workflow paging
through results on a database-search server loops on page one.

**`posts-for-channel`'s three cursors are not interchangeable.** `since` is a millisecond timestamp
and returns everything created *or edited* after it, which makes it the right choice for a polling
sync; `before`/`after` take a post id.

**`channel-members-list` returns membership records, not users** — `user_id` and `roles`, no username.
Resolving names needs a second call per user.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | informational | Reads `status.mattermost.com/api/v2/summary.json` |
| `instance` | dependency | connection | (default `degraded`) | Probes this server's `/api/v4/system/ping`, unsigned |
| `quota` | quota | connection | informational | Reads `X-Ratelimit-Remaining` from this server |
| `auth:access-token` | — | connection | — | Derived from `Auth.test` automatically |

### The status page is real — checked three ways

| Path | Status | Bytes | md5 (first 12) |
| --- | --- | --- | --- |
| `/api/v2/summary.json` | 200 | 1,850 | `83e120c03920` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |
| `/history.atom` | 200 | 36,820 | `4d75816fcc87` |

Three different answers, so it is not a catch-all; the body is `application/json` parsing as the
Statuspage v2 schema, matching neither the ~127,700-byte unclaimed-`statuspage.io` signature nor the
~216,800-byte unclaimed-`instatus.com` one; and it self-identifies as
`page.name: "Mattermost"`, `page.url: "https://status.mattermost.com"`.

**Why `informational`:** its components are **Sign-Up**, **Customer Portal**, **Cloud Workspaces**,
**Calls** and **Community** — the vendor's hosting business, its billing site and its own community
server. A self-hosted install, frequently on a private network, is unaffected by all of them. This
check is `scope: "app"` so it cannot tell Cloud Connections from self-hosted ones; at the `degraded`
default an incident on Mattermost Cloud would pin every self-hosted tenant at `degraded`. Same call
`apps/metabase`, `apps/baserow` and `apps/discourse` make. Nothing is lost — `instance` probes each
Connection's own server.

### `quota` is a live probe, which makes it the exception in this pack

Most apps here declare `quota` as `unavailable` because the vendor exposes nothing to read.
Mattermost publishes the standard `X-Ratelimit-*` trio — *when rate limiting is switched on*. It is
off by default, so the check reports the real numbers when present and `unknown` with an explanation
when not, at `informational` severity so a default-configured server cannot drag the App's verdict to
`unknown`.

Declaring it `unavailable` instead would have been *false* for every operator who has enabled rate
limiting, which is the common configuration for an internet-facing server.

Headroom is judged as a **fraction of the limit**, not a raw count: Mattermost's default is 10
requests per second per IP, so "3 remaining" is routine there and alarming on a server configured for
100.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Files and attachments** | Uploads are multipart and need a two-step upload-then-reference flow. `file_ids` on a post is supported for files already uploaded. |
| **Reactions, pins, flags, acknowledgements** | Small and worth having; left out to keep this first pass reviewable. |
| **Users: create, update, deactivate, search** | User administration is a different job from messaging, and most of it needs system-admin permission. |
| **Teams: create, members, invites** | Same — team administration rather than a workflow step. |
| **Channel update, archive, restore, move, privacy** | Channel *administration*. Create, membership and lookup cover what a workflow needs. |
| **Incoming/outgoing webhooks, slash commands, OAuth apps** | Integration *configuration*, and webhooks belong to a trigger surface rather than an action surface. |
| **WebSocket events** | A trigger surface, and a persistent connection this runtime does not hold. |
| **System console, compliance, data retention, LDAP, SAML** | Server administration. |

## Icon

`assets/icon.svg` is **Mattermost's own mark**, not a drawing. It was taken verbatim from n8n's
`nodes-base`, which is where several of this pack's vendor marks come from:

```
https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Mattermost/mattermost.svg
```

The paths and Mattermost's brand blue (`#0058CC`) are unmodified. Run `deno task fmt`, never bare
`deno fmt` — the latter reformats `assets/` and would rewrite the vendor paths.

## Layout

```
mattermost/
├── index.ts                  # AppDefinition: 13 actions, 1 auth, 3 health checks
├── lib/client.ts             # server URL from the connection, post envelope, error taxonomy
├── auth/access-token.ts      # Bearer PAT/bot token, /users/me probe, version from X-Version-Id
├── actions/                  # one file per action
├── health/                   # service (Statuspage) + instance (ping) + quota (X-Ratelimit-*)
└── tests/                    # 94 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 94 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
