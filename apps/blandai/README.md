# Bland AI

Send AI phone calls, manage conversational pathways, phone numbers, and voices, on the **Bland
core REST API** (`api.bland.ai`).

- **Categories** — ai, communication
- **Auth methods** — api-key
- **Actions** — 19
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.bland.ai` (the `service` check adds `status.bland.ai` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.bland.ai/
- **API docs** — https://docs.bland.ai
- **Status page** — https://status.bland.ai/

Bland is an enterprise voice AI platform: telephony, speech-to-text, language model, text-to-speech
and conversational-pathway orchestration in one stack. A call either follows a `task` prompt (a
plain-language objective) or a **pathway** (a node/edge graph built in Bland's dashboard, or
authored programmatically via `pathway-create`/`pathway-update`).

> **Everything below was verified against Bland's own sources on 2026-08-29** — its
> `llms-full.txt` machine-readable documentation export (1,829,091 bytes: every reference page
> concatenated, each preceded by the real `METHOD https://host/path` line the Mintlify docs site
> renders above it), plus live, unauthenticated probes against `api.bland.ai` and
> `status.bland.ai`. Nothing here came from a third-party integration directory or from Bland's
> marketing site.

## The findings most likely to trip up a new integration

### 1. The auth header carries the raw key — no `Bearer` prefix

Every cURL/Python/JS example for the core REST surface this app covers reads
`Authorization: YOUR_API_KEY` — the bare key, not `Authorization: Bearer YOUR_API_KEY`. A handful
of newer reference pages outside this app's scope (SIP port cancellation, live-translation
sessions) show the `Bearer`-prefixed form instead, and a live probe against `GET /v1/me` cannot
disambiguate the two (both an unprefixed and a `Bearer`-prefixed wrong key answer the identical
`401 AUTH_FAILURE`/`Unauthorized`). This app follows the documented majority and sends the raw key
(`auth/api-key.ts`).

### 2. Two response envelopes coexist, unpredictably

Older surface (`/v1/calls`, `/v1/calls/{id}/stop`, `/v1/pathway/*`) answers success as a flat
object (`{"status":"success","call_id":"…"}`, or the resource itself with no envelope at all) and
failure as `{"status":"error","message":"…","errors"?: string[]}`. Newer surface
(`/v1/calls/active/transfer`) answers `{"data": …, "errors": null}` on success and
`{"data": null, "errors": [{"error":"CODE","message":"…"}]}` on failure — and that second shape is
also what **every** endpoint answers for a missing/invalid API key, regardless of which envelope
its success path uses. `lib/client.ts`'s `parseBlandError` handles both without guessing which one
a given endpoint will use; `BlandClient.request` and `BlandClient.data` let each action pick per
endpoint rather than the client guessing.

### 3. Two documented endpoints live outside `/v1`

`POST /numbers/purchase` (`number-purchase`) and `POST /inbound/update_label` (not covered by this
app) are real and confirmed live — an unauthenticated request to either answers the same
`AUTH_FAILURE` envelope every `/v1/*` route does — but neither sits under the `/v1` prefix every
other endpoint uses. `index.test.ts` pins `number-purchase`'s literal path so a future "helpful"
`/v1` cleanup breaks loudly instead of silently 404ing.

### 4. `GET /v1/pathway`'s own documentation looks like a copy-paste bug

The "Get All Pathways" reference page's response fields and example describe a **single** pathway
(`name`/`description`/`nodes`/`edges`) — byte-for-byte identical to the single-pathway
`GET /v1/pathway/{id}` page — which cannot be literally right for a "list all" endpoint. Every
other Bland list endpoint this app covers wraps its array under a named key (`voices`,
`inbound_numbers`, `calls`), so `pathway-list` accepts whichever shape actually arrives: a bare
array, `{"pathways": [...]}`, or (matching the doc literally) a single object — see
`actions/pathway-list.ts`.

### 5. No secret leaks in this app's surface, and no rate-limit headers at all

Unlike several vendors in this pack (Apify's proxy password, Follow Up Boss's `/me`), nothing in
Bland's call, pathway, number, voice, or account responses echoes the API key or another usable
secret back to the caller — confirmed by reading every response schema this app touches, not
merely a status code. No redaction helper was needed. Separately, a live 401 probe against
`GET /v1/me` carries no `X-RateLimit-*`/`RateLimit-*` header of any kind — the only headroom signal
Bland exposes is the account's own credit balance, which `health/quota.ts` reads instead of a
request-rate check.

## Auth

**API Key** (`auth/api-key.ts`) — a key minted in the Bland dashboard (Settings > API Keys), sent
as `Authorization: <key>`. Bland publishes no OAuth surface for this REST API.

The `test` probe is `GET /v1/me`, chosen the way this pack always chooses a probe: by reading the
response *schema*, not the endpoint's name. `/v1/me` requires a credential (verified: a missing/
invalid key answers `401 AUTH_FAILURE` live) and its documented response
(`{"status", "billing": {"current_balance", "refill_to"}, "total_calls"}`) carries account
metadata and a credit balance, never the API key or another secret. It is also the same read
`health/quota.ts` uses for headroom, so a live Connection costs one call per check interval, not
two.

## Actions

**Calls** — `call-send`, `call-list`, `call-get` (includes the full transcript), `call-list-active`,
`call-stop`, `call-stop-all`, `call-transfer`, `call-analyze`.

**Pathways** — `pathway-list`, `pathway-get`, `pathway-create`, `pathway-update`, `pathway-delete`.

**Numbers** — `number-list`, `number-get`, `number-purchase`.

**Voices** — `voice-list`, `voice-get`.

**Account** — `account-get`.

### `call-send` deliberately does not cover every documented field

`POST /v1/calls` documents an extensive body (model/dispatch/knowledge/audio/analysis/post-call/
advanced parameter groups). `call-send` covers the fields most workflows need to start and shape a
call — phone number, task or pathway, voice, persona, model, language, timing, transfer number,
recording, webhook, metadata. Left out for this v1, and confirmed real (not guessed away):
`tools` (custom-tool objects), `dynamic_data`, `guard_rails`, `dispositions`, `retry`,
`citation_schema_ids`, `pronunciation_guide`, `transfer_list`, `dialing_strategy`,
`precall_dtmf_sequence`, `keywords`, `ignore_button_press`, and the `voicemail`/`post_call_evals`
sub-objects.

### `x-bland-org-id` on `call-list-active`

Bland's own reference lists `x-bland-org-id` as a **required** header for `GET /v1/calls/active`
alongside `authorization` — but this could not be confirmed against a live authenticated call (no
test credential was available during verification), and every other endpoint in this app's surface
authenticates on the API key alone. `call-list-active` exposes it as an optional `orgId` param,
sent only when provided, rather than assuming it is mandatory.

## Not covered in this v1

Bland's reference documents a much larger surface than calls/pathways/numbers/voices/account. Left
out deliberately rather than built against guesses:

- **Agent testing & evals** — test scenarios, simulation sets, tornado sessions, eval agents,
  workbench setups, eval runs.
- **Knowledge bases** — file/text/web-scrape ingestion, sitemap discovery, conversational query.
- **Widgets** — web chat/voice widget management, custom components, live-agent messaging.
- **Tools (v1/v2)** — custom-API and built-in integration tool definitions and execution logs.
- **Messaging** — SMS/RCS/iMessage conversations, batch sends.
- **SIP trunks** — attach/detach, port requests, firewall IPs, test calls.
- **Memory** — contact memory records, legacy memory stores.
- **Triage, personas, custom dialing pools, citation schemas, alarms, blocked numbers, prompts,
  organizations** — real, documented, but outside this v1's scope.
- **Bland Speech (`/v2/tts`, `/v2/audio/speech`)** — standalone text-to-speech synthesis, separate
  from the call surface.

## Health checks

- **`service`** (`kind: service`, unsigned) — `status.bland.ai`, an Atlassian Statuspage, checked
  three ways on 2026-08-29: real JSON content-type and Statuspage-v2 body shape (not the ~127,700
  -byte HTML an unclaimed instance serves), a `page` block that self-identifies as `"Bland AI"` at
  `status.bland.ai`, and a live top-level indicator (`"none"`/`"All Systems Operational"` at
  verification time). Components repeat by name across regional groups (measured 10 components,
  several named `API`) — the same trap DigitalOcean and Lever hit in this pack — so components are
  keyed by vendor id, never by name.
- **`quota`** (`kind: quota`, signed, scope: connection) — reads `billing.current_balance` from
  `GET /v1/me`, the account's remaining pay-as-you-go call credit (Bland publishes no rate-limit
  headers at all). Bland documents no fixed ceiling for this figure, so the check reports
  `remaining` without a `limit` (unless `refill_to` is set) and derives state from two documented
  signals instead: account `status` other than `"active"` → `degraded`; balance at or below zero →
  `down` (calls cannot dispatch); a low-but-positive balance (this app's own judgment call, not a
  vendor-documented line) → `degraded`.
- **`auth:api-key`** (derived) — the same `GET /v1/me` credential-liveness probe used by `test`.

## Development

```bash
deno task validate   # manifest + sandbox conformance (@w6w/validator + source scan)
deno task check       # typecheck
deno task lint        # deno lint
deno task test        # unit tests, mocked HookContext
deno task fmt         # format (never bare `deno fmt` — see house rules)
```
