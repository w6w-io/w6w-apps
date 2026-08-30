# Quo

A business phone system — shared numbers, calling, texting, voicemail, contacts and tasks for a
whole workspace, on the **Quo Public API v1**.

> **Formerly OpenPhone.** OpenPhone rebranded to Quo in 2026 — same product, same team, same API.
> `openphone.com` now 301-redirects to `www.quo.com`, and `api.openphone.com` still answers
> identically to `api.quo.com` (verified live). This app targets `api.quo.com`, the host the
> vendor's own current OpenAPI document and docs samples use.

- **Categories** — communication, crm
- **Auth methods** — api-key
- **Actions** — 43
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.quo.com` (the `service` check adds `status.quo.com` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.quo.com/
- **API docs** — https://www.quo.com/docs/mdx/api-reference/introduction
- **Machine-readable spec** — https://openphone-public-api-prod.s3.us-west-2.amazonaws.com/public/openphone-public-api-v1-prod.json
- **Status page** — https://status.quo.com/

> **Everything below was verified against Quo's own sources on 2026-08-30** — its
> machine-readable OpenAPI document (linked from `www.quo.com/docs/mdx/guides/building-with-ai-llms`,
> `info.title` "Quo Public API"), its hand-written docs
> (`www.quo.com/docs/mdx/api-reference/*`), and live probes against `api.quo.com`,
> `api.openphone.com` and `status.quo.com`. Nothing here came from a third-party integration
> directory.

## The five things most likely to go wrong

### 1. The rebrand reaches the API host itself

The OpenAPI document's own `servers[0].url` is `https://api.quo.com`, and every code sample in
Quo's *current* docs (`send-your-first-message`, the Google Sheets contact-sync guide) calls that
host. `api.openphone.com` still answers — measured live, byte-identical 401 body, same headers —
but it is the *legacy* host, not what the vendor's own current material points at. This app calls
`api.quo.com` only; `api.openphone.com` is not in `network.allow` since nothing here calls it.

### 2. No `Bearer` prefix

Quo's own auth guide is explicit: "The Quo API does not use a Bearer token for authentication."
Confirmed by the OpenAPI security scheme too (`{"type": "apiKey", "in": "header", "name":
"Authorization"}`, no prefix). `auth/api-key.ts` stamps the raw key directly.

### 3. The live error envelope does not match the OpenAPI document's own error schema

The spec's per-status response schemas all describe `{message, code, status, docs, title, trace?,
errors?}`. Live probes against `api.quo.com` — both unauthenticated and with a
syntactically-plausible fake key — answer a **different**, undocumented shape instead:
`{"error": {"message": "...", "key": "Unauthorized", "trace": "..."}}`, e.g.
`{"error":{"message":"Missing authorization header","key":"Unauthorized","trace":"..."}}` with no
credential at all, vs `{"error":{"message":"Unauthorized","key":"Unauthorized","trace":"..."}}`
for a wrong one — Quo *does* word the two cases differently even though both carry the same
`key`. `lib/client.ts`'s `formatQuoError` parses the envelope actually observed on the wire. A
route that doesn't exist at all answers a bare Express HTML 404, not JSON.

### 4. List Calls and List Messages share a `participants` query param with different limits

Both take a repeated `participants` query key (no brackets — `participants=+1555...`), but
`call-list` accepts **exactly one** (`maxItems: 1`, Quo's own words: "Currently limited to
one-to-one (1:1) conversations only") while `message-list` accepts **up to 10** (more than one
sends a single group message, per the API's 2026-06-16 changelog entry). Pattern-matching one
action's shape onto the other silently narrows or breaks it.

### 5. Contact `PATCH` replaces rather than merges

Per Quo's own endpoint description: "This endpoint replaces the contact rather than merging into
it: any defaultFields.emails, defaultFields.phoneNumbers or customFields you omit from the
request body is deleted on the contact." `contact-update` always sends the full set a caller
wants the contact to end up with — the README calls this out explicitly on the params, and
`idempotent: true` reflects that resending the same full body reliably reproduces the same state
(not that a partial body is safe).

## Auth

One method: `api-key`, type `apiKey` — `Authorization: <key>` (no prefix). Generated per workspace
under **Settings > API** (owner/admin only); "each key provides full API access" — there is
nothing narrower to request, so there is no "this key may lack a scope" caveat here.

### The probe is `GET /v1/phone-numbers`

Quo publishes no dedicated whoami/ping endpoint. `phone-number-list` needs no required query
parameters (unlike `calls`/`messages`, which need a `phoneNumberId` the auth hook has no reason
to already know) and is literally step 1 of Quo's own "Send your first message" quickstart — so
this probe is exactly what a new integration calls first anyway, not a check invented for this
purpose.

## Actions

43 actions across 8 resource groups.

| Key | Type | Endpoint |
| --- | --- | --- |
| `phone-number-list` | search | `GET /v1/phone-numbers` |
| `phone-number-get` | read | `GET /v1/phone-numbers/{phoneNumberId}` |
| `message-send` | perform | `POST /v1/messages` |
| `message-list` | search | `GET /v1/messages` |
| `message-get` | read | `GET /v1/messages/{id}` |
| `call-list` | search | `GET /v1/calls` |
| `call-get` | read | `GET /v1/calls/{callId}` |
| `call-summary-get` | read | `GET /v1/call-summaries/{callId}` |
| `call-transcript-get` | read | `GET /v1/call-transcripts/{id}` |
| `call-voicemail-get` | read | `GET /v1/call-voicemails/{callId}` |
| `call-recordings-get` | read | `GET /v1/call-recordings/{callId}` |
| `contact-create` | perform | `POST /v1/contacts` |
| `contact-list` | search | `GET /v1/contacts` |
| `contact-get` | read | `GET /v1/contacts/{id}` |
| `contact-update` | perform | `PATCH /v1/contacts/{id}` |
| `contact-delete` | perform | `DELETE /v1/contacts/{id}` |
| `contact-custom-field-list` | search | `GET /v1/contact-custom-fields` |
| `conversation-list` | search | `GET /v1/conversations` |
| `conversation-mark-as-done` | perform | `POST /v1/conversations/{id}/mark-as-done` |
| `conversation-mark-as-open` | perform | `POST /v1/conversations/{id}/mark-as-open` |
| `conversation-mark-as-read` | perform | `POST /v1/conversations/{id}/mark-as-read` |
| `task-list` | search | `GET /v1/tasks` |
| `task-create` | perform | `POST /v1/tasks` |
| `task-get` | read | `GET /v1/tasks/{taskId}` |
| `task-update` | perform | `PUT /v1/tasks/{taskId}` |
| `task-delete` | perform | `DELETE /v1/tasks/{taskId}` |
| `task-complete` | perform | `POST /v1/tasks/{taskId}/complete` |
| `task-reopen` | perform | `POST /v1/tasks/{taskId}/reopen` |
| `task-assign` | perform | `POST /v1/tasks/{taskId}/assign` |
| `task-unassign` | perform | `POST /v1/tasks/{taskId}/unassign` |
| `task-change-due-date` | perform | `POST /v1/tasks/{taskId}/change-due-date` |
| `task-remove-due-date` | perform | `POST /v1/tasks/{taskId}/remove-due-date` |
| `task-link-conversation` | perform | `POST /v1/tasks/{taskId}/link-conversation` |
| `task-unlink-conversation` | perform | `POST /v1/tasks/{taskId}/unlink-conversation` |
| `user-list` | search | `GET /v1/users` |
| `user-get` | read | `GET /v1/users/{userId}` |
| `webhook-list` | search | `GET /v1/webhooks` |
| `webhook-get` | read | `GET /v1/webhooks/{id}` |
| `webhook-delete` | perform | `DELETE /v1/webhooks/{id}` |
| `webhook-create-message` | perform | `POST /v1/webhooks/messages` |
| `webhook-create-call` | perform | `POST /v1/webhooks/calls` |
| `webhook-create-call-summary` | perform | `POST /v1/webhooks/call-summaries` |
| `webhook-create-call-transcript` | perform | `POST /v1/webhooks/call-transcripts` |

### Idempotency

`message-send`, `contact-create`, `task-create`, and all four `webhook-create-*` actions are
**not idempotent** — Quo documents no idempotency key for any of them; a retry duplicates the
side effect. Every other `perform` action is **idempotent**: deletes and state-setters
(mark-as-done/open/read, complete/reopen, assign/unassign, change/remove due date,
link/unlink-conversation) reach the same end state regardless of call count, and `contact-update`/
`task-update` reliably reproduce the same state when resent with the same body (see finding 5 for
why that "same body" qualifier matters for contacts specifically).

### `task-create` needs exactly one of three link fields

Quo requires **exactly one** of `phoneNumberId`/`conversationId`/`activityId` — its own OpenAPI
document models this as three separate required-field variants rather than one object with three
optional links. `task-create` validates this client-side (throws before the network call) rather
than letting an ambiguous or empty request reach the API and produce a less specific error.

### The three `conversation mark-as-*` actions return the resource directly

Every other successful response in this API is `{"data": <resource>}`. The three mark-as-done/
open/read endpoints are the one exception, verified against the OpenAPI document's own response
schema for those paths — they return the updated conversation object with **no** `data` wrapper.

### `contact-create`/`contact-update`'s custom fields are raw JSON, not typed fields

Custom contact field **definitions** can only be created or edited inside the Quo app itself; the
API can only read them (`contact-custom-field-list`) and set **values** for a contact matching
whatever fields a given workspace happens to have defined (address / boolean / date /
multi-select / number / string / URL, each with a differently-shaped `value`). Rather than modeling
every possible shape, both actions expose `customFields` as a single JSON param
(`[{key, value}]`) — call `contact-custom-field-list` first to see what a workspace has defined.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — `status.quo.com` is Atlassian Statuspage

Verified live on 2026-08-30: `api/v2/summary.json` answers `200` with the standard Statuspage
document — `page.name: "Quo"` (the page itself carries the rebrand), `status.indicator`, and 13
components mixing end-user surfaces (Android/iOS/Mac/Windows/Web App, Website, Support) with the
pieces this app's API calls actually touch (`Quo API`, `Calling`, `Text Messaging`,
`Infrastructure`, `Voicemail`, `Integrations`). `status.openphone.com` redirects to the same page
(confirmed via `curl -L`), so only the current host is used. Same shape and rollup semantics as
this pack's other Statuspage-backed checks (mirrored from `assemblyai/health/service.ts` rather
than re-derived) — group headers are skipped in favor of their children.

### `quota` — undocumented but present IETF rate-limit headers

Quo's own "Rate limits" doc states a flat ceiling — "Each API key may make up to 10 requests per
second" — with **no mention of a response header**. Measured live on 2026-08-30, headers are
present anyway, on both a 401 and a 200: `ratelimit: "per-second"; r=9; t=1` and
`ratelimit-policy: "per-second"; q=10; w=1` — the IETF `ratelimit`/`ratelimit-policy`
structured-field draft, not `X-RateLimit-*` (the same shape this pack's `huggingface` app
documents for its own Hub headers). `severity: "informational"` since the vendor's own docs never
promise the header exists, so a future removal shouldn't fail a target outright.

## Deliberately not covered

- **The beta unified webhook API** (`POST /webhooks`, open beta since 2026-05-11). Quo's changelog
  documents a newer surface that combines message/call/contact events into one subscription, with
  a **different signing scheme** (Standard Webhooks/Svix, a `whsec_...` secret, not the legacy
  `OpenPhone-Signature` header) and a **wider event set** — five additional call lifecycle events
  (`call.ringing`, `call.answered`, `call.forwarded`, `call.missed`,
  `call.voicemail.completed`) and contact events (`contact.updated`, `contact.deleted`) with no
  equivalent in the legacy per-resource endpoints this app covers. The OpenAPI document this app
  was built against does not list it, and a beta surface's shape is not yet a stable contract to
  build a generated action against. This app covers the four legacy, generally-available
  `POST /webhooks/{messages,calls,call-summaries,call-transcripts}` create endpoints instead.
- **MCP connector** (`mcp.quo.com/mcp`) — a separate, Claude/ChatGPT-facing surface, not a REST
  endpoint this app's actions could wrap.
- **Sona** (Quo's AI receptionist) configuration — the docs mention Sona-handled calls carry
  summaries/transcripts (covered by `call-summary-get`/`call-transcript-get`), but no endpoint to
  configure Sona itself is documented in the OpenAPI spec.

## Setup

1. Log in to Quo, open **Settings > API** (workspace owner or admin only).
2. Click **Generate API key**, give it a descriptive label (no spaces allowed in the name).
3. Copy the key into the Connection's **API Key** field — it is never echoed back by any action
   or health check in this app.
4. To send text messages to US numbers via the API, complete **US Carrier Registration** first
   (Settings > API links to this) — an unregistered workspace gets a documented API error rather
   than a silent failure.

## Icon

`assets/icon.png` is Quo's own `android-chrome-512x512.png`
(`https://cdn.quo.com/favicon/android-chrome-512x512.png`, 512×512, 4,886 bytes), sourced from the
`<link rel="icon">` tags on `quo.com`'s own HTML — the current vendor mark, not the legacy
OpenPhone one.
