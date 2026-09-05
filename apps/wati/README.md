# Wati

Send WhatsApp template and session messages, manage contacts, and read
conversation history through Wati's WhatsApp Team Inbox / Business API
platform — each customer's own tenant endpoint.

- **Categories** — communication, support
- **Auth methods** — api-token
- **Actions** — 12
- **Egress allowlist** — `*` (every Wati tenant is its own host — see below)
- **Website** — https://wati.io
- **API docs** — https://docs.wati.io/ (ReadMe-hosted; the OpenAPI 3.0.4 document, `info.title:
  "WhatsApp chat API"`, `info.version: "v3"`, is embedded per-endpoint rather than published as a
  single downloadable file — extracted directly from the reference pages). Read 2026-09-05.

## Setup

1. In Wati, go to **Team Inbox → API Docs** (or **Connector → API**) and click **Generate new
   token**. Optionally scope it (`contacts:read`, `contacts:write`, `messagetemplate:read`, …)
   and set an expiry — Wati recommends rotating every 6 months.
2. On the same page, copy your account's own **API Endpoint** — it looks like
   `https://live-mt-server.wati.io/305xxxxxxxx` or `https://live-mt-server-105.wati.io/305xxxxxxxx`.
   Every Wati customer has a different shard prefix and tenant id in this URL.
3. Paste the API Endpoint and API Token into the connection.

### Why the allowlist is `*`

Wati has no single shared API host: each customer's endpoint carries its own shard prefix
(`live-mt-server` or `live-mt-server-NNNNN`) and tenant id, both assigned by Wati and shown only
in that customer's own account. The OpenAPI document itself declares no `servers` entry at all.
So — like `kintone`, `mautic` and `tableau` in this pack — the tenant's own endpoint is a
connection field and egress is `*`.

### Two API versions; this app targets V3 only

Wati's own docs are explicit: "**API V3** (recommended) — Use this for all new integrations.
Endpoints use the `/api/ext/v3/...` path" vs "**API V1** (legacy) — The older API, still
available but not recommended for new projects." This app implements only V3.

### Auth is typed `apiKey`, but the real wire format is a hand-typed `Bearer` header

Wati's OpenAPI security scheme is declared `type: "apiKey"`, `in: "header"`, `name:
"Authorization"` — not `type: "http", scheme: "bearer"` as the OpenAPI spec would normally model
a bearer token. Its own `description` explains why: *"Enter 'Bearer' [space] and then your
token"* — the doc site's own "Try It" panel expects the literal header text typed in. This app's
`auth/api-token.ts` reproduces the real wire format (`Authorization: Bearer <token>`) via
`apiKey.prefix`, matching the authentication guide's own cURL example.

## Actions

| Key | Type | Description |
|---|---|---|
| `account-credits-get` | read | Read this tenant's paid credit, welcome credit and free-conversation balance |
| `contacts-count-get` | read | Count contacts, optionally filtered to a date range |
| `contacts-list` | read | List contacts, paginated |
| `contact-get` | read | Get one contact's full details |
| `contact-create` | perform | Add a new contact |
| `contacts-update` | perform | Set custom parameters on one or more contacts in one call |
| `contact-delete` | perform | Soft-delete a contact |
| `conversation-messages-get` | read | List a conversation's messages, paginated |
| `message-text-send` | perform | Send a free-form text message into an active (24h) conversation |
| `message-file-send` | perform | Send a file, by URL, into an active (24h) conversation |
| `templates-list` | read | List approved WhatsApp message templates, paginated |
| `template-messages-send` | perform | Send an approved WhatsApp template to one or more recipients |

### Session messages need an active conversation; templates open one

`message-text-send` and `message-file-send` only work inside WhatsApp's 24-hour session window —
the operation's own description states "Status code 200 means the message was accepted by WATI,
not delivered yet," and delivery/failure/read status only arrives later via webhook (this app
declares no `triggers`, so that surface is not implemented here — see below). To message a
recipient with no open session, send an approved template first (`template-messages-send`),
which is also the only way to reach someone for the first time.

### The same "custom params" concept is spelled two different ways

`contact-create` (`POST /contacts`) sends `custom_params` (snake_case); `contacts-update`
(`PUT /contacts`) sends `customParams` (camelCase) on each item in its `contacts` array — verified
directly against both operations' own request schemas in the same API version. Neither action
normalises this away: each sends the literal key its own operation documents, because a shared
"custom params" helper would inevitably pick one spelling and silently break the other endpoint.

### A 401 is documented in prose only, and is often bodyless

Every other 4xx/5xx across the whole V3 document shares one `{code, message, timestamp}` shape
(`InvalidRequestResponse` / `ForbiddenRequestResponse` / `UnexpectedErrorResponse` — all
structurally identical), but **no path declares response content for `401` at all** — the
generic `errors` reference page states it in prose only ("401 — No valid API key provided.").
Every action's error handling degrades to raw response text when the documented `{code,
message}` shape is not present, rather than assuming every failure is JSON.

## Auth: credential probe reuses the account-credits read

Wati publishes no dedicated whoami/ping endpoint. `GET /api/ext/v3/account/credits` is the
narrowest documented V3 read that takes no parameters and needs no pre-existing resource id —
its own description states it "returns the caller's own credit balance ... identity is derived
from the authenticated tenant context." The connection test classifies the response by body
(a `credit` field present on 200), not by status code alone, and degrades gracefully on a
bodyless 401 (see above). `health/quota.ts` reuses the same call rather than duplicating it.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Wati's own shared platform up? |
| `quota` | quota | How much send-credit does this tenant have left? |
| `tenant` | dependency | Is **this connection's** own API endpoint reachable? |

### `service`: a real status feed, with a vendor-side identity bug this app works around

`status.wati.io` is a genuine, live Zoho StatusIQ (Site24x7) status page publishing an RSS feed
at `https://status.wati.io/rss`, including a component literally named **"Wati API"**. This app
does **not** use this platform's declarative `feed:` health-check support for it, because that
feed's `<guid>` is not a per-component identity — it is `base64(pubDate)`, and every component
published in the same status-update batch shares the identical guid (confirmed live 2026-09-05:
a batch of 10 items — Analytics, Automations, Billing, Campaign, Contacts, Login, Onboarding,
Team Inbox, Wati API, Webhook, all "Operational" — all carried the same `<guid>`, with no
per-item `<link>` to disambiguate). The host's generic feed-backed check support folds a status
feed down to the newest entry **per id**, which for this feed would silently collapse 9 of 10
components onto whichever is processed first for a shared guid — possibly losing "Wati API"
entirely. `health/service.ts` fetches the feed itself and groups by **title** instead, reading
only the newest `"Wati API - <status>"` entry.

`quota` reads `account/credits` — a real, checkable balance (paid credit, welcome/trial credit,
free-conversation count) — because the documented per-plan request-rate limits (`errors`:
`10/10sec`, `30–100/10sec` depending on plan/endpoint) carry **no** response header or counter
endpoint of any kind to read instead.

`tenant` sends an **unsigned** request to `GET /api/ext/v3/account/credits` against the
connection's own endpoint. It classifies only whether the host answers at the network level at
all (a real HTTP response, of any status, means `ok`; a DNS/connection failure means `down`) —
deliberately not the response body, since no path in the OpenAPI document declares a schema for
`401` to pattern-match against without a live tenant to verify one.

## What is deliberately left out

- **Interactive messages** (buttons, list, product, product-list) — `POST
  /conversations/messages/interactive` is a genuinely polymorphic request body (four different
  nested shapes keyed by a `type` field) that deserves its own careful action rather than one
  `json`-blob passthrough; left for a follow-up.
- **Broadcast management** (`GET /broadcasts`, `/broadcasts/{id}`, `/broadcasts/overview`,
  `/broadcasts/estimate-cost`) — reading broadcast history/analytics, not sending; out of scope
  for this first release's messaging-and-contacts focus.
- **Calls** (`GET /calls`, recordings/transcripts/summaries, batch variants) — a distinct surface
  (WhatsApp Calling API) unrelated to messaging/contacts.
- **WhatsApp Groups** (create/list/invite/manage participants) — a separate conversational
  surface from the 1:1 messaging this app covers.
- **Chatbots** (`GET /chatbots`, `POST /chatbots/start`) — triggering a chatbot flow, not sending
  a message directly.
- **Sales Analytics / Pipeline / Lead Stages, Segments, Posts/Comments** (Instagram/Messenger
  inbox features) — adjacent surfaces outside WhatsApp messaging and contact management.
- **Legacy V1/V2 endpoints** (`/api/v1/...`, `/api/v2/...`) — Wati's own docs recommend V3 for
  all new integrations; see above.
- **Webhooks/triggers** — this app declares no `triggers`; delivery/read/reply status for a sent
  message only arrives via webhook, which is a separate subsystem from the request/response
  actions here.

## Icon

`assets/icon.svg` is Wati's own vector mark, fetched directly from
`https://www.wati.io/wp-content/uploads/2023/03/wati-icon.svg` (verified 2026-09-05: a real
802-byte SVG, two paths, Wati's green/near-black glyph — not a placeholder). `wati.io/favicon.ico`
answers `200 image/x-icon` but with **zero bytes downloaded** on a full `GET` (confirmed, not a
HEAD-vs-GET artifact) — a genuinely empty/decoy favicon — so the marketing site's own linked SVG
icon was used instead of that or a third-party icon set.
