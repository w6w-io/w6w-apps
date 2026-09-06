# Vapi

Place voice/web calls against an existing Assistant, Squad or Workflow, manage those calls
afterward, and read the Assistant/phone-number/Squad/Tool/file catalogs behind them, on Vapi's
voice-AI infrastructure platform.

- **Categories** — ai, communication
- **Auth methods** — private-key
- **Actions** — 18
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:private-key`
- **Egress allowlist** — `api.vapi.ai` (the `service` check adds `status.vapi.ai` to its own hook
  allowlist, never to the app's)
- **Website** — https://vapi.ai/
- **API docs** — https://docs.vapi.ai/quickstart/introduction
- **OpenAPI** — https://api.vapi.ai/api-json (live, ~2.1 MB)
- **Status page** — https://status.vapi.ai/

Vapi is voice-AI infrastructure: an Assistant (transcriber + LLM + voice pipeline, optionally a
Squad of several handing off calls, or a Workflow) is configured once in the Vapi dashboard or API,
then driven over phone or web calls. The unit this app moves around is the **call**.

> **Everything below was verified against Vapi's own sources on 2026-09-06** — its live,
> machine-readable OpenAPI document (`https://api.vapi.ai/api-json`, 2,111,869 bytes, `info.version`
> `"1.0"`), and live probes against `api.vapi.ai` and `status.vapi.ai`. Nothing here came from a
> third-party integration directory.

## The three things most likely to cost you a day

### 1. Two keys, and the vendor's own 401 body names the mistake

Every Vapi project has a **Private Key** (full server-side access — what this app uses) and a
**Public Key** (scoped for the client-side `@vapi-ai/web` SDK to start a browser call). Pasting the
public key into this app's connection is not a silent partial failure — confirmed live:

```
$ curl -H "Authorization: Bearer <public key>" https://api.vapi.ai/assistant
401 {"message":"Invalid Key. Hot tip, you may be using the private key instead of the public key,
     or vice versa.","error":"Unauthorized","statusCode":401}
```

`auth/private-key.ts`'s `test` hook surfaces that message verbatim rather than flattening it to a
bare "401 Unauthorized", because the vendor already did the diagnosis. A request with **no**
`Authorization` header at all gets the same JSON shape (`{"message":"Missing Authorization
Header.","error":"Unauthorized","statusCode":401}`), so there is only one error envelope to handle —
unlike some vendors in this pack that answer a missing vs. an invalid credential with two
incompatible shapes.

### 2. Two incompatible pagination shapes on the same host

Every list endpoint this app calls **except phone numbers** answers a bare JSON array, and
paginates *only* by `createdAtGt/Lt/Ge/Le` and `updatedAtGt/Lt/Ge/Le` date-range filters plus
`limit` (default 100, max 1000) — there is no offset and no cursor. `GET /v2/phone-number` alone
answers a completely different envelope:

```json
{ "results": [ /* phone numbers */ ], "metadata": { "itemsPerPage": 100, "totalItems": 42,
  "currentPage": 1, "totalPages": 1, "hasNextPage": false } }
```

and paginates by a `page` number instead. `phone-number-list` unwraps `{results, metadata}`;
every other `*-list` action here unwraps a bare array. Code written against one shape and pointed
at the other gets `undefined.length` or an object where an array was expected.

### 3. `GET /file` requires `purpose` — every other list filter in this API is optional

`GET /file` is the one list endpoint in this whole surface whose `purpose` query parameter is
**required** (`assistant` | `composer-attachment` | `knowledge-base-v2`), and it has no `limit` or
`createdAt`/`updatedAt` filtering of any kind. Omit `purpose` here (unlike every other list action
in this app, where every filter is optional) and Vapi answers `400`, not "list everything."

## What this app deliberately does NOT do

Vapi's most complex objects — Assistants, Squads and Tools — are **not** created or updated here.
Each request body is a deeply nested, polymorphic configuration object:

- `CreateAssistantDTO` embeds a transcriber, an LLM `model`, a voice provider, a compliance plan, an
  analysis plan, and an array of dynamic per-call `credentials` — one of a dozen-plus provider
  shapes each.
- `CreateSquadDTO`'s `members`/`membersOverrides` mirror that same complexity per member.
- `POST /tool` accepts a **twelve-way discriminated union** — API Request, Code, DTMF, End Call,
  Function, Transfer Call, Handoff, Bash, Computer, Text Editor, Query, and more — each with its own
  unrelated schema.

These are objects meant to be authored once in the Vapi dashboard (or directly against the API by
someone reading its own reference) and then referenced by id from a workflow, not re-typed into a
generated form — the same scoping call this pack's [`retellai`](../retellai/README.md) app made for
its own Agent object. What this app covers in full instead is the **operational** surface: start a
call against any of the three, list/inspect/rename/delete calls, and read every catalog
(Assistants, phone numbers, Squads, Tools, Files) by id or list.

`file-create` is the one exception — file upload has no such polymorphism — but content is UTF-8
text only: every `ctx.fetch` body in this app's sandbox is coerced to a string on its way to the
network, so a true binary upload cannot survive the trip (the same constraint and technique this
pack's [`box`](../box/README.md) app documents).

## Auth

**Private Key** (`auth/private-key.ts`, `type: "bearer"`) — `Authorization: Bearer <private key>`,
confirmed against `components.securitySchemes.bearer` (`{"scheme": "bearer", "type": "http"}`) in
the OpenAPI document. Get it from Vapi Dashboard → API Keys → **Private Key** (not Public Key).

The credential-liveness probe is `GET /assistant?limit=1` — it requires a credential (confirmed:
no header → `401 "Missing Authorization Header."`), needs no scope beyond an ordinary private key
(Vapi's key model has no narrower, resource-scoped tokens to worry about), and its response is a
bare array of the caller's own Assistants. Vapi's own OpenAPI document states the one field that
could carry a live secret back (`credentials[].apiKey` on a credential DTO) is "not returned in the
API" — and every action in this app additionally strips any `apiKey`/`secret`/`clientSecret`/
`token`/`password`-named field from its response as defense in depth (`stripSecrets` in
`lib/client.ts`), since an Assistant or Call response can embed a `credentials[]` array or a webhook
`server.headers` block, and a workflow step's result is persisted and displayed.

There is no `/me`, `/org` or `/account` endpoint anywhere in the API, so there is nothing to read
for a connection label (`afterConnect` is omitted rather than faked).

## Actions

| Resource | Actions |
|---|---|
| Assistant | `assistant-list`, `assistant-get`, `assistant-delete` |
| Call | `call-create`, `call-list`, `call-get`, `call-update` (rename only), `call-delete` (erases stored data, does **not** hang up — see below) |
| Phone Number | `phone-number-list` (page-paginated, `/v2/phone-number`), `phone-number-get` |
| Squad | `squad-list`, `squad-get` |
| Tool | `tool-list`, `tool-get` |
| File | `file-list` (requires `purpose`), `file-get`, `file-create` (text content only), `file-delete` |

### There is no REST endpoint to end a live call

`UpdateCallDTO` (`PATCH /call/{id}`) has exactly one field: `name`. `call-update` can only rename a
call for your own reference. Ending a live call is driven by its transport — the phone/SIP leg
hanging up, or the client SDK's own `.stop()` — never by this REST API. Do not confuse
`call-delete` (`DELETE /call/{id}`, the vendor's own `deleteCallData` operation) with hanging up:
it erases a call's stored recordings/transcript/artifacts and has no effect on a call in progress.
Vapi documents a specific `503` for it too — "Failed to erase call recordings; the call was not
deleted. Retry the request." — a real, distinct, retryable failure mode.

### `assistant-delete` and the `assistant_pinned` conflict

Deleting an Assistant currently pinned as a phone number's inbound handler is refused with a `409`
carrying `{"error": "assistant_pinned", "message": "..."}` — a different shape from every other
error in this API (`{"error": "<reason phrase>", ...}`). `formatVapiError` (`lib/client.ts`)
surfaces it exactly as sent, since the message already names the fix (unpin the phone number
first).

### `call-create` covers by-id targets only

`assistantId`, `squadId` and `workflowId` are supported (provide exactly one); the transient
inline-config forms (`assistant`, `squad`, `workflow` objects in the request body) are not, for the
same reason `assistant-create` does not exist — see above. `assistantOverrides` is exposed as a
free-form JSON param for per-call template variables and setting overrides.

## Health checks

- **`service`** (`kind: "service"`) — `status.vapi.ai`, a genuine Better Stack page (verified via its
  own `/index.json`, `company_name: "Vapi"`, `company_url: "https://vapi.ai"`). The
  Statuspage-shaped path a reader would try first, `status.vapi.ai/api/v2/summary.json`, `301`s back
  to the page's own HTML — it is Better Stack only, despite the Statuspage-style subdomain, and
  `vapi.statuspage.io` is the separate, unclaimed-Statuspage decoy (`302` to statuspage.io's own
  marketing page). The page tracks Vapi's own infrastructure (API, EU API, Dashboard, Auth, SIP,
  per-carrier inbound/outbound legs, Call Logs) plus a **"Providers"** section for the upstream
  model/voice vendors Vapi depends on (OpenAI, Anthropic, Deepgram, ElevenLabs, Cartesia, Daily.co,
  Gladia, Soniox, Google Gemini) — reported under their own name so an OpenAI incident is never
  mistaken for a Vapi one. The page's own `aggregate_state` roll-up is the primary signal.
- **`quota`** — declared `unavailable`, `severity: "informational"`. The OpenAPI document has no
  `/org`, `/account`, `/billing` or `/usage` endpoint of any kind, and a live `401` probe carried no
  rate-limit header. Concurrent-call and monthly-spend ceilings are configured and viewed only in
  the Vapi dashboard.
- **`auth:private-key`** — derived automatically from `auth/private-key.ts`'s `test` hook.

## Gaps — left out deliberately

- **Assistant/Squad/Tool create and update** — see "What this app deliberately does NOT do" above.
- **Campaigns, Evals/Simulations, Chat, Structured Output, Knowledge Base v2, Sessions, Analytics,
  Reporting (Boards/Insights), Observability Scorecards, provider-resource passthrough** — all real,
  documented endpoints, out of scope for this app's first pass. None was implemented speculatively;
  each is a real path in the OpenAPI document that a future app revision can add without touching
  what is here.
- **Phone number create** — `POST /phone-number` is a five-way discriminated union (BYO, Twilio,
  Vonage, Vapi-hosted, Telnyx), each requiring vendor-specific fields this app has no way to verify
  without live credentials for each provider; left out rather than guessed.
