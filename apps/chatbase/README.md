# Chatbase

Create and manage Chatbase AI agents, chat with them, and run their conversations, knowledge
sources, helpdesk, and WhatsApp channel — on the **Chatbase API v2**.

- **Categories** — ai, support, communication
- **Auth methods** — api-key
- **Actions** — 35
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `www.chatbase.co` (both v2 and the one v1 action share this host)
- **Website** — https://www.chatbase.co/
- **API docs** — https://www.chatbase.co/docs/api-v2/overview
- **OpenAPI** — https://www.chatbase.co/docs/api-v2-merged-openapi.json

> **Everything below was verified against Chatbase's own sources on 2026-08-29** — its
> machine-readable OpenAPI 3.1 document
> ([`api-v2-merged-openapi.json`](https://www.chatbase.co/docs/api-v2-merged-openapi.json),
> 323,394 bytes, `info.version` `2.0.0`), the prose pages under `/docs/api-v2/*`, and live probes
> against `www.chatbase.co`. Nothing here came from a third-party integration directory.

## Three things that shaped this app

### 1. Two live REST APIs, and this app targets the newer one — with one exception

Chatbase publishes **v1** (`www.chatbase.co/api/v1` — chatbots, chat, conversations, leads,
contacts, assets) and **v2** (`www.chatbase.co/api/v2` — agents, chat, conversations, sources,
helpdesk, WhatsApp) side by side, and its own v1 docs point integrators at v2: *"Looking for API
v2? … Check out the API v2 Reference."* v2 is also the only surface with structured error codes,
cursor pagination, and a helpdesk at all.

So every action here targets v2 — **except `lead-list`**, which reads v1's `GET /get-leads`. As of
this writing v2 has no leads endpoint of any kind, so that one capability has no v2 form to prefer.
Both hosts are the same hostname (`www.chatbase.co`), so this costs nothing in `network.allow`.

v2 additionally requires a **Standard Plan or above**; a key from an unsupported plan fails every
v2 call with `SUBSCRIPTION_API_RESTRICTED_PLAN`. `auth/api-key.ts`'s `test` hook distinguishes that
from a plain bad key. v1 carries no such restriction.

### 2. No usable vendor status page exists

Checked three ways on 2026-08-29:

| Candidate                                    | Result                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `chatbase.statuspage.io/api/v2/summary.json` | **302s to `https://www.statuspage.io`** — the unclaimed-page decoy signature this pack documents elsewhere |
| `status.chatbase.co`                          | Resolves, but its TLS certificate **expired 2024-05-13**, and even with verification disabled the origin behind it answers `DEPLOYMENT_NOT_FOUND` (a dead Vercel project) |
| `www.chatbasestatus.com` and similar guesses  | Do not resolve                                                          |

So `health/service.ts` reads the API's own unauthenticated `GET /health` instead
(`{"status": "ok", "timestamp": …}`, documented at `/docs/api-v2/health/health-check`) — Chatbase's
own API process reporting on itself, and the best signal Chatbase publishes for whether the
platform is up. It needs no credential, so a bad or revoked key never presents as an outage there;
that is `auth:api-key`'s job.

### 3. File-type knowledge sources are out of scope, on purpose

Chatbase accepts PDF/DOC/DOCX/TXT uploads for a knowledge source, but that endpoint
(`POST /agents/{agentId}/sources`, the *file* variant) runs on a **different host**,
`files.chatbase.co`, as a **binary multipart** body — its own docs say so explicitly: *"Base URL:
`https://files.chatbase.co/api/v2` — this endpoint uses a different host from all other Sources
endpoints."*

This sandbox's `ctx.fetch` coerces every request body to a string on its way to the network, which
corrupts anything but plain text — the same limitation that caps this pack's Box and Dropbox
uploads to text content. Rather than ship an action that silently mangles a PDF, file sources are
left out entirely. **Text, Q&A, and link sources are unaffected** and fully covered by
`source-create` / `source-update`, which post plain JSON to the ordinary `www.chatbase.co` host.

## Response shapes — three, not one

Reading every response schema in the OpenAPI document rather than guessing from a sample:

| Shape                              | Endpoints                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `{"data": [...], "pagination": {…}}` | Every paginated list — agents, sources, conversations, messages, tickets, ticket search |
| **Bare resource, no envelope**       | A single Agent, Source, or Ticket; the fire-and-forget actions (`{"success": true}` for update/delete/train/toggle, `{"id", "pendingSteps"?}` for create/clone) |
| `{"data": {...}}`                    | The chat-family endpoints only — chat, retry, submit-tool-result, update-message-feedback |
| **Bare array, no key at all**        | `ticket-statuses`, `teams`                                                |
| **Neither `data` nor an array key**  | WhatsApp templates list (`{"templates", "complete", "unavailableWabaIds"}`) |

[`lib/client.ts`](lib/client.ts) exposes `request()` (returns the body verbatim) and `unwrap()`
(pulls `data` out of the chat-family shape) rather than pretending there is one envelope. The
chat-family actions (`agent-chat`, `message-retry`, `tool-result-submit`,
`message-feedback-update`) are the only callers of `unwrap()` — get that wrong and a workflow step
receives `{data: {...}}` instead of the message it asked for.

## Errors — two shapes, because one action still speaks v1

v2 failures are `{"error": {"code", "message", "details"?}}` with a stable machine `code`
(`AUTH_INVALID_API_KEY`, `CHAT_CREDITS_EXHAUSTED`, `SOURCE_LINK_LIMIT_EXCEEDED`, …) — see
[the vendor's error table](https://www.chatbase.co/docs/api-v2/error-handling). v1 failures are the
older `{"message": string}` shape with no code at all. `formatChatbaseError` in
[`lib/client.ts`](lib/client.ts) handles both.

## Rate limiting

100 requests per 10-second sliding window, scoped per API key **and** IP. Every response — success
or failure — carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (Unix
**milliseconds**, not seconds); a `429` additionally carries `Retry-After` in seconds.
`health/quota.ts` reads these from the cheapest signed call in this app's surface
(`GET /agents?limit=1` — the same call the credential probe uses) rather than a dedicated endpoint,
and never reports worse than `degraded`: a ten-second window recovers on its own.

**Message credits are a separate, unrelated quota** — the workspace's plan allowance for chat
responses — and Chatbase publishes no endpoint to read a balance in advance. It only surfaces as
`CHAT_CREDITS_EXHAUSTED` / `CHAT_AGENT_CREDITS_EXHAUSTED` at chat time, so it is not represented in
the `quota` health check; a check that can only ever answer "unknown" for it would be noise.

## Health checks

| Check | Kind | Credential | What it reads |
| --- | --- | --- | --- |
| `service` | service | none | `GET /health` — see "No usable vendor status page" above |
| `quota` | quota | signed | `X-RateLimit-*` headers on `GET /agents?limit=1` |
| `auth:api-key` (derived) | credential | signed | The Auth method's own `test` hook |

## Auth

**API Key** (`auth/api-key.ts`) — `Authorization: Bearer <key>`, from Workspace settings > API
keys. Chatbase documents no OAuth surface for third-party integrations.

The credential-liveness probe is `GET /agents?limit=1`, not the unauthenticated `/health` (which
cannot tell a live key from a missing one) and not a dedicated whoami (Chatbase publishes none).
`limit=1` keeps the read to at most one agent's metadata; an empty workspace answering `data: []`
is still a healthy connection. `test` also distinguishes a missing header
(`AUTH_MISSING_API_KEY`), a rejected key (`AUTH_INVALID_API_KEY` / `AUTH_EXPIRED_API_KEY`), and a
plan restriction (`SUBSCRIPTION_API_RESTRICTED_PLAN`) — three different problems with three
different fixes.

## Actions by area

**Agents** — `agent-list`, `agent-get`, `agent-create`, `agent-update`, `agent-delete`,
`agent-train`, `agent-clone`, `agent-auto-retrain-toggle`.
`agent-create`/`agent-update` leave out `channelInstructions` (per-channel prompt overrides) and
`agent-styles` (widget theming) entirely — both are deeply nested, open-ended objects Chatbase
does not document as a small, stable set of fields, and inventing form fields for them would be
guessing a shape rather than reading one.

**Chat** — `agent-chat`, `message-retry`, `tool-result-submit`. All three are always sent with
`stream: false`: Chatbase's default is Server-Sent Events, but an Action returns one JSON result to
the next workflow step, not an open connection — SSE has no meaningful projection onto that model.
`stream: false` gets the same content back as a single JSON object instead.

**Conversations** — `conversation-list`, `conversation-get`, `conversation-messages-list`,
`conversation-user-list`, `message-feedback-update`. Note the two different pagination directions:
plain conversation lists page forward, newest-created last, while conversation *messages* page
**backward from the newest message** (the first page is the most recent).

**Sources** — `source-summary-get`, `source-list`, `source-get`, `source-create`, `source-update`,
`source-delete`, `source-restore`. Covers text, Q&A, and link sources; see "File-type knowledge
sources are out of scope" above for what's deliberately missing.

**Helpdesk** — `ticket-status-list`, `team-list`, `ticket-create`, `ticket-list`, `ticket-search`,
`ticket-get`, `ticket-update`, `ticket-messages-list`, `ticket-message-add`.

**WhatsApp** — `whatsapp-template-list`, `whatsapp-template-send`.

**Leads (v1)** — `lead-list`. See "Two live REST APIs" above.

## Tests

```
deno task test      # unit tests, mocked HookContext
deno task check      # typecheck
deno task lint        # deno lint
deno task validate    # @w6w/validator against package.json + index.ts
```
