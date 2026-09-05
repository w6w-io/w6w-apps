# Dust

List, search and inspect agents, drive conversations (create, message, cancel generation, attach
content), and read/search the workspace's spaces and data sources, on the **Dust REST API**.

- **Categories** — ai, productivity
- **Auth methods** — api-key
- **Actions** — 11
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `dust.tt`, `eu.dust.tt` (the `service` check adds `status.dust.tt` to its
  own hook allowlist, never to the app's)
- **Website** — https://dust.tt/
- **API docs** — https://docs.dust.tt/
- **OpenAPI** — https://raw.githubusercontent.com/dust-tt/dust/main/front-api/public/swagger.json
- **Status page** — https://status.dust.tt/

Dust is a workspace platform for building and running AI **agents** on a company's own knowledge and
tools. Work happens in **conversations** — a user (or, here, a workflow) posts a message, optionally
`@mentioning` an agent, and the agent replies. This app covers that surface end to end: list/get/
search agents, create a conversation, post follow-up messages, cancel an in-progress generation,
attach inline text as a content fragment for extra context, and read the workspace's spaces
(projects) plus semantic search over one data source's documents.

> **Everything below was verified against Dust's own sources on 2026-09-05** — its OpenAPI 3.0
> document (`raw.githubusercontent.com/dust-tt/dust/main/front-api/public/swagger.json` —
> `dust-tt/dust` is the product's own monorepo, `info.version` `1.0.2`, 92 paths — cross-checked
> against the same document re-served through `docs.dust.tt/api-reference/**/*.md`), the prose pages
> it links, and live probes against `dust.tt` and `status.dust.tt`. Nothing here came from a
> third-party integration directory.

## The three things most likely to cost someone a day

### 1. Two regional hosts that don't cross-authenticate

The OpenAPI document declares two `servers` — `https://dust.tt` (`us-central1`) and
`https://eu.dust.tt` (`europe-west1`) — and they are not interchangeable. A workspace lives in
exactly one region, and its API key only works against that region's host (corroborated by the
vendor's own JS SDK, `@dust-tt/client`, which takes the host as a plain constructor option rather
than deriving it). **The wrong region for an otherwise-correct key looks exactly like a bad key**:
both fail with `401 invalid_api_key_error`.

The connection form ([`auth/api-key.ts`](auth/api-key.ts)) collects `region` alongside the key and
workspace id for this reason, and both `test` and the `service` health check name the other region as
the first thing to try when a key is otherwise correct.

### 2. The bearer value's *shape* is checked before it's looked up

Live probes against `dust.tt/api/v1/w/x/spaces` on 2026-09-05 found three distinct 401 bodies, not
one generic "unauthorized" — none of this is stated in the OpenAPI document or the prose docs:

| Request                                              | Response                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| No `Authorization` header                             | `401 not_authenticated`                                 |
| A bearer value not shaped like a Dust key (no `sk-` prefix) | `401 malformed_authorization_header_error`         |
| An `sk-`-prefixed value Dust doesn't recognise        | `401 invalid_api_key_error`                             |

The middle case is checked *before* the key is ever looked up — a key with the wrong shape never
gets as far as "is this a real key?". `auth/api-key.ts`'s `test` hook reports all three distinctly:
the first two mean "reconnect with the key copied exactly", the third could also mean "revoked in
Workspace Settings" or "wrong region" (see above).

### 3. The legacy "Dust Apps" surface is deprecated — don't add it

The OpenAPI document still carries an `Apps`/`Runs` tag (`GET/POST .../spaces/{spaceId}/apps`,
`.../apps/{aId}/runs`) — Dust's original "chain of prompted LLM calls" product, predating agents.
`docs.dust.tt/docs/developer-platform/legacy-dust-apps` states plainly: **"Dust Apps are deprecated.
Only Dust Apps created before October 2025 are accessible. The creation of new Dust Apps is
deactivated."** This app deliberately implements none of it. If a future change wants to add it back,
re-check that notice first — it may by then mean "removed," not "frozen."

## What this app does NOT cover, and why

- **Streaming events** (`GET .../conversations/{cId}/events`, `.../messages/{mId}/events`) — these
  are Server-Sent Events endpoints, which don't fit the request/response `execute` shape an Action
  needs. Poll `conversation-get` instead; `conversation-create` defaults `blocking: true` specifically
  so most workflows never need to poll at all.
- **File upload** (`POST /files`) and file-backed content fragments (`fileId`) — this app's
  `content-fragment-create` only covers the inline-text half of the `ContentFragment` schema
  (`content` + `contentType`), which needs no separate upload step.
- **Mentions/suggestions, skills, MCP server registration, analytics export, triggers webhooks** —
  all real, documented v1 endpoints, left out to keep this app's surface to the
  agent/conversation/knowledge core; none of them contradicts anything implemented here.
- **The private (`/api/w/{wId}/...`, no `/v1/`) routes** — session-cookie-authenticated web-app
  endpoints (`Private User`, `Private Authentication`, `Private Conversations`, …). The OpenAPI
  document's `security` metadata for these is inconsistent with how the web app actually calls them;
  none is part of the documented API-key surface this app authenticates against.

## Create Message's documented response schema can't be the real response

`POST .../conversations/{cId}/messages`'s `200` response schema in the vendor's own OpenAPI document
is a byte-for-byte copy of the *request* body's `Message` schema (`content` + `mentions`, no `sId`,
`status`, or `created`) — visibly not what a "create" endpoint returns, since the caller cannot know
the created message's server-assigned fields in advance. Every other message-shaped object this app
observed (`Conversation.content[][]`, in the Get Conversation / Create Conversation response) carries
`sId`/`status`/`created`/`type` instead, so the true response almost certainly matches that shape —
but this app could not confirm it against a live conversation. Rather than asserting field names the
spec doesn't actually support, [`actions/message-create.ts`](actions/message-create.ts) returns the
response body verbatim and says so in its own doc comment. Use `conversation-get` to read the message
back in its confirmed shape.

## Auth

**API Key** (`auth/api-key.ts`, `type: "custom"`) — `Authorization: Bearer <api key>`, the OpenAPI
document's sole `securitySchemes` entry (`BearerAuth`, `scheme: bearer`). Create one under Workspace
Settings > Developer Tools > API Keys; it is scoped to the workspace it was minted in.

Three fields are collected, not one, because every Dust v1 path is `/api/v1/w/{wId}/...`:

- `apiKey` (secret) — the `sk-`-prefixed bearer token.
- `workspaceId` (string) — the short id in the workspace's own URL. Not a secret; every request is
  scoped to it.
- `region` (select, `us` default) — which of the two hosts to call.

`workspaceId` and `region` are echoed onto the Connection's `display` by `afterConnect` (mirroring
`apps/kustomer/auth/api-key.ts`'s `orgSubdomain`), which is where [`lib/client.ts`](lib/client.ts)
reads them from — no Action ever sees the credential.

## Health checks

- **`service`** ([`health/service.ts`](health/service.ts)) — reads `status.dust.tt/api/v2/summary.json`,
  a genuine Atlassian Statuspage (`page.name: "Dust"`, verified not a catch-all: the summary path
  answers 5,700 bytes of structured JSON, not the ~127,700-byte HTML shell an unclaimed
  `*.statuspage.io` page serves). Scoped to the five components this app's surface actually touches —
  `API` and `Conversations`/`Data Sources` (under the "Dust Developer Platform" and "Dust
  Application" groups), plus both `us-central1`/`europe-west1` region components. Deliberately
  excludes `Dust App Platform` (the deprecated legacy surface, see above), the four third-party
  `Connection - *` rows, `Dust Slackbot`, `Chrome Extension`, and a component literally named
  `Testing Component`.
- **`quota`** ([`health/quota.ts`](health/quota.ts)) — declared `unavailable` (`severity:
  "informational"`). Verified live: no response (success or 401) carries any `X-RateLimit-*` or
  `Retry-After` header. The vendor's Rate Limits page documents exactly two fixed ceilings — 120
  document upserts/minute (a write path this app doesn't call) and 10,000 Dust App runs/day (the
  deprecated legacy surface this app doesn't implement) — and states only that Create
  Conversation/Message *may* return 429, with no published number for it.
- **`auth:api-key`** (derived from `Auth.test`) — `GET /spaces`, the narrowest-privilege endpoint in
  this app's surface: no resource scope, no write access, just "does this key open this workspace."

## Actions

| Key | Type | What it calls |
| --- | --- | --- |
| `agent-list` | read | `GET /assistant/agent_configurations` |
| `agent-get` | read | `GET /assistant/agent_configurations/{sId}` |
| `agent-search` | search | `GET /assistant/agent_configurations/search` |
| `conversation-create` | perform | `POST /assistant/conversations` |
| `conversation-get` | read | `GET /assistant/conversations/{cId}` |
| `message-create` | perform | `POST /assistant/conversations/{cId}/messages` |
| `conversation-cancel` | perform | `POST /assistant/conversations/{cId}/cancel` |
| `content-fragment-create` | perform | `POST /assistant/conversations/{cId}/content_fragments` |
| `space-list` | read | `GET /spaces` |
| `data-source-list` | read | `GET /spaces/{spaceId}/data_sources` |
| `data-source-search` | search | `GET /spaces/{spaceId}/data_sources/{dsId}/search` |

Only `conversation-cancel` is idempotent among the `perform` actions — cancelling an
already-cancelled (or already-finished) message id is a no-op, not a second side effect. Every other
write starts a new resource (a conversation, a message, a content fragment) with no documented
idempotency key, so a retry would duplicate — and, once an agent is mentioned, separately bill — the
work.

## Icon

`assets/icon.svg` is Dust's own favicon mark, fetched from `docs.dust.tt`'s own asset host
(`mintcdn.com/dust/.../branding/favicon.svg`) — a distinctive seven-piece colored square, not a
generic placeholder.
