# Retell AI

Place outbound phone and web calls, batch-dial a list of numbers, search call history, and read
agent/phone-number/voice catalogs, on Retell AI's voice-agent platform.

- **Categories** — ai, communication
- **Auth methods** — api-key
- **Actions** — 9
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.retellai.com` (the `service` check adds `status.retellai.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.retellai.com/
- **API docs** — https://docs.retellai.com/api-references/create-phone-call
- **OpenAPI** — https://docs.retellai.com/openapi.yaml
- **Status page** — https://status.retellai.com/

Retell AI runs AI voice and chat agents over phone and browser calls. The unit this app moves
around is the **call** — created against an **agent** already configured in the Retell dashboard
(voice, LLM, tools) — plus the phone-number and voice catalogs a caller needs to pick one.

> **Everything below was verified against Retell's own sources on 2026-08-24** — its
> machine-readable OpenAPI 3.1 document
> ([`docs.retellai.com/openapi.yaml`](https://docs.retellai.com/openapi.yaml), 13,058 lines, served
> off a Mintlify docs site), and live probes against `api.retellai.com` and `status.retellai.com`.
> Nothing here came from a third-party integration directory.

## The three things most likely to go wrong

### 1. Two error envelopes, not one

The OpenAPI document's `components.responses` describes every 4xx/5xx as
`{"status": "error", "message": "..."}`. That IS what comes back for a malformed request and for an
**invalid** API key — confirmed live:

```
$ curl -H "Authorization: Bearer wrong" https://api.retellai.com/get-concurrency
401 {"status":"error","message":"Invalid API Key."}
```

But a request with **no** `Authorization` header at all answers a completely different,
**undocumented** shape — confirmed live against three separate endpoints on 2026-08-24:

```
$ curl https://api.retellai.com/get-concurrency
401 {"error_message":"Authorization header required"}
```

A caller that only reads `body.message` (the documented field) silently treats a missing-credential
response as unreadable, because that field does not exist on this shape. `formatRetellError` in
[`lib/client.ts`](lib/client.ts) reads both, and [`auth/api-key.ts`](auth/api-key.ts)'s `test` hook
names the real problem either way — verified by
[`tests/auth/api-key.test.ts`](tests/auth/api-key.test.ts), which pins both response shapes as
fixtures rather than asserting only the documented one.

### 2. Three pagination conventions inside one API

| Endpoint                    | Pagination lives in         | Filter lives in | Envelope                              |
| ---------------------------- | ---------------------------- | ---------------- | -------------------------------------- |
| `POST /v3/list-calls`        | JSON body                    | JSON body         | `{items, has_more, pagination_key}`    |
| `POST /v2/list-agents`       | **query string**              | JSON body         | `{items, has_more, pagination_key}`    |
| `GET /v2/list-phone-numbers` | query string                 | *(none exists)*   | `{items, has_more, pagination_key}`    |
| `GET /list-voices`           | *(none — no cursor at all)*  | *(none exists)*   | **bare JSON array**                    |

`list-agents` is the one most likely to trip an integration: it is a `POST`, so the instinct is to
put everything in the body, but its `limit`/`sort_order`/`pagination_key` are documented
`parameters` (query string) while only `filter_criteria` is in the `requestBody`. `v3/list-calls`
also explicitly forbids combining `skip` with `pagination_key` on the same request (its JSON Schema
carries a `"not": {"required": ["skip", "pagination_key"]}`) — this app only ever sends
`pagination_key`, never `skip`. See [`lib/client.ts`](lib/client.ts) for the full writeup and
[`actions/list-agents.ts`](actions/list-agents.ts) / [`actions/list-calls.ts`](actions/list-calls.ts)
/ [`actions/list-voices.ts`](actions/list-voices.ts) for how each is handled.

### 3. A call is fire-and-poll, not fire-and-read — and concurrency, not request rate, is the real ceiling

`create-phone-call` and `create-web-call` both return immediately with `call_status: "registered"`.
`transcript`, `recording_url`, `call_analysis` and `duration_ms` populate only once the call reaches
`ended` or `error`, which happens asynchronously — reading `get-call` right after creating one
returns a call that legitimately has none of that yet. Poll `get-call` until the status changes, or
configure the agent's webhook in the Retell dashboard instead.

Separately, Retell's `429` body (`{"status":"error","message":"Account rate limited, please
throttle your requests."}`) carries no rate-limit header of any kind — no `Retry-After`, no
`X-RateLimit-*`. What the API *does* expose in advance is **concurrency**: `GET /get-concurrency`
reports exact current/limit figures for calls in progress right now, shared across inbound,
outbound and batch calls. `actions/get-concurrency.ts` exposes it as a read, and
[`health/quota.ts`](health/quota.ts) reports the same figures on the health surface — including that
`concurrency_burst_enabled` raises the real ceiling to `concurrency_burst_limit`, so reading the base
`concurrency_limit` alone understates headroom for an org that paid for burst.

## Actions

| Key | Type | What it does |
| --- | --- | --- |
| `create-phone-call` | perform | `POST /v2/create-phone-call` — dial an outbound call from a Retell-owned/imported number. |
| `create-web-call` | perform | `POST /v2/create-web-call` — start a browser call session; returns a client `access_token`. |
| `create-batch-call` | perform | `POST /create-batch-call` — queue a list of outbound calls, immediately or scheduled, with optional calling-window and reserved-concurrency limits. |
| `get-call` | read | `GET /v2/get-call/{call_id}` — a call's current status, transcript and recording. |
| `list-calls` | search | `POST /v3/list-calls` — search by agent/status/number, cursor-paginated. |
| `list-agents` | search | `POST /v2/list-agents` — list voice/chat agents, cursor-paginated. |
| `list-phone-numbers` | search | `GET /v2/list-phone-numbers` — numbers owned by or imported into the account. |
| `list-voices` | read | `GET /list-voices` — the whole voice catalog, unpaginated. |
| `get-concurrency` | read | `GET /get-concurrency` — current vs. maximum concurrent calls. |

Left out, and why:

- **Agent/conversation-flow/knowledge-base CRUD** (`create-agent`, `update-agent`,
  `create-conversation-flow`, `create-knowledge-base`, …) — these author the agent's own behavior
  (prompt, tools, voice, LLM config) rather than *use* an already-configured agent, which is a
  different, much larger surface this app does not model. An agent is expected to already exist,
  configured in the Retell dashboard, before a workflow calls it.
- **`agent_override` / `override_agent_version`** on the call-creation actions — both take a nested
  object mirroring a large slice of the Agent schema; `override_agent_id` (a plain string swap to a
  different, already-configured agent) is exposed instead, since it is unambiguous.
- **Chat** (`create-chat`, `create-sms-chat`, `list-chats`, …) — a separate product surface (text
  conversations, not voice calls) with its own analysis/transcript shapes; left for a follow-up
  rather than folded into this app's call-centric action set.
- **Contacts, CRM sync, batch tests, alert rules** — workspace-configuration and QA surfaces with no
  clear single "do this" action shape; left out rather than guessed at.

## Auth

**`api-key`** (`bearer`) — `Authorization: Bearer <api_key>`, per `components.securitySchemes.api_key`
in the OpenAPI document. There is no OAuth surface and no query-parameter form documented anywhere.

The credential-liveness probe is `GET /get-api-key-info`. It requires the header (confirmed:
unauthenticated it also 401s), and its response — `{org_name, api_key_name}` — is a stated fact
about the *key*, never the key material itself, so the probe's result is safe to store and display
on the health surface verbatim. `afterConnect` reuses it to label each Connection with the org's own
name (`connectionLabel: "Retell AI ({{orgName}})"`), since every Connection would otherwise read
"Retell AI" with nothing to tell two workspaces apart.

## Health checks

| Key | Kind | Scope | Credential | Severity | Probe |
| --- | --- | --- | --- | --- | --- |
| `service` | service | app | none | degraded | `GET status.retellai.com/api/v2/summary.json` |
| `quota` | quota | connection | signed | degraded | `GET /get-concurrency` |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` method's `test` hook |

`status.retellai.com` is a **real, claimed** Atlassian Statuspage — confirmed live on 2026-08-24:
`page.name` is `"Retell AI"`, `page.url` is `https://status.retellai.com`, and it carries a
component literally named **"API"** whose description reads `"Retell AI APIs\nhttps://docs.retellai.
com/api-references/"` — the exact surface this app is built against. Fifteen components in total,
grouped under `End to End Calling` (Web Call, Phone Call), `Chat` (SMS chat, API chat) and `Features`
(Alerting, Agent Testing, Analytics, Batch Call, QA, Knowledge Base), plus the standalone `API` and
`Dashboard`. The check reports the page-level indicator as its verdict and every leaf component (not
just the ones this app's actions touch) as detail, matching this pack's usual pattern for a
Statuspage-backed check.

`quota` never reports worse than `degraded`: running at the concurrency ceiling means the *next*
call is refused or queued, a rolling condition that clears the moment a call ends, not a stop for the
org the way a monthly usage cap can be.

## Icon

`assets/icon.png` — Retell's own favicon mark (96×96 PNG), downloaded verbatim from
`https://cdn.prod.website-files.com/64ada0f2685b2d18caa5e699/69d92f1c5d4356ef4c7589cc_favicon-96x96.png`,
linked from `<link rel="icon">` on `www.retellai.com`. No SVG icon-only mark exists: the site's only
`.svg` asset is a 72×20 wordmark (`logo.svg`, icon glyph plus "Retell" text set as one path group),
not usable on a square tile. The favicon PNG is the vendor's real square mark — a ring of eight dots
in `#1A1B45` navy — so it ships as-is per this pack's existing PNG-icon precedent (`bluesky`, `deel`).

That mark is a single dark ink, which fails `_tools/icon-legibility.ts`'s dark-tile check (`deno task
validate` catches this — measured ΔE 53.48 / contrast 6.25 against the dark tile, both individually
inside the "separable" thresholds, but too small a share of the 96×96 raster's pixels clear the bar).
`assets/icon.dark.png` is a hand-authored reversed-to-white raster (same dots, same alpha mask, ink
recolored to `#FFFFFF`) declared at `appearance.darkMode.icon` — the same "reversed mark" treatment
`icon-legibility.ts fix` generates automatically for an SVG, done by hand here because that tool only
writes SVG dark variants.

## Tests

68 assertions across 13 files: one per action, one for the auth method, one each for `service` and
`quota`, and `index.ts`'s cross-cutting manifest/sandbox/health invariants.

```
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/retellai && deno task validate && deno task check && deno task lint && deno task test'
```
