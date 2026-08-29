# OpenRouter

Chat completions, embeddings, and model/usage introspection via OpenRouter's unified LLM API.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 6
- **Egress allowlist** — `openrouter.ai`
- **Website** — https://openrouter.ai
- **API docs** — https://openrouter.ai/docs/api_reference/overview (canonical OpenAPI document:
  https://openrouter.ai/openapi.json)

## What this app does

OpenRouter fronts 400+ models from dozens of providers behind one OpenAI-compatible
`/chat/completions` endpoint, so a single credential and a single request shape can call
`openai/gpt-5.2`, `anthropic/claude-sonnet-4.6`, or any other listed model — including
OpenRouter-only routing controls layered on top: an explicit fallback model list (`models` +
`route: "fallback"`), provider preferences, and plugins (web search, PDF parsing).

Embeddings are exposed the same way. Models can be listed and filtered (free-text search,
category) to keep a workflow's model choice explicit rather than hardcoded. Because every call is
billed and metered centrally, a generation's exact token counts and cost can be pulled back after
the fact by id, and the connected key's own credit limit/usage can be checked directly.

## Actions

| Action | Type | Endpoint |
|---|---|---|
| `chat-completion` | perform | `POST /chat/completions` |
| `embeddings` | perform | `POST /embeddings` |
| `list-models` | read | `GET /models` |
| `get-generation` | read | `GET /generation?id=...` |
| `get-key-info` | read | `GET /key` |
| `get-credits` | read | `GET /credits` |

All endpoints are relative to `https://openrouter.ai/api/v1`.

Streaming (`stream: true`) is not modeled on `chat-completion` — it always returns the
fully-materialized response, matching this pack's other LLM apps (`mistral`, `openai`,
`anthropic`).

### A sharp edge: two kinds of API key

Every action but one works with a regular inference API key (minted at
https://openrouter.ai/keys). **`get-credits`** is the exception: OpenRouter's own docs state
`GET /credits` requires a separate **Management API key** (minted at
https://openrouter.ai/settings/provisioning-keys), and that a management key "cannot be used to
make API calls to OpenRouter's completion endpoints" — the reverse restriction. Both key types
sign the same way (`Authorization: Bearer <key>`), so this app's single `api-key` Auth method
covers both, but a Connection made with a regular inference key will get rejected by `get-credits`
specifically. Use `get-key-info` (`GET /key`, works with a regular key) for the connected key's own
usage/limit instead — it is very likely the action most workflows actually want.

### Model routing fields on `chat-completion`

`models` (fallback list) + `route: "fallback"`, `provider` (hosting-provider preferences: order,
allow/deny, data-retention policy) and `plugins` (`[{ "id": "web" }]` for web search,
`[{ "id": "file-parser" }]` for PDF parsing) are OpenRouter-only additions on top of the normalized
OpenAI-compatible request. They are grouped under "advanced" in the param list since most calls
don't need them.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared unavailable** — OpenRouter publishes nothing machine-readable. Verified live
2026-08-29, two candidate surfaces, neither usable:

1. `status.openrouter.ai` is a client-rendered SPA (built on OnlineOrNot, per its
   `data-domain="dashboard.onlineornot.com"` analytics tag). Every path this pack's other apps read
   for a machine-readable feed — `/api/v2/summary.json`, `/api/v2/status.json`, `/rss`, `/feed`,
   `/history.rss`, `/badge.json`, `/status.json` — 404s to the same HTML shell.
2. `openrouter.statuspage.io` is an **unclaimed Statuspage decoy**: it 302s to
   `https://www.statuspage.io`, Atlassian's own marketing page for the Statuspage product — not a
   real status page for this vendor at all.

The `auth:api-key` derived check (below) is the automatable signal for "is OpenRouter working" —
it fails the same way a real outage would, for anyone with a live key.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

The single auth method probes:

```
GET /key
```

"Get current API key" — returns usage/limit metadata for whichever key authenticated the request.
Its `label` field is a vendor-masked preview of the key (e.g. `"sk-or-v1-au7...890"` in
OpenRouter's own docs example), never the raw credential, which is what makes it safe to use as a
liveness probe. Free, and needs no scope beyond "is this a live key".

### Do we have quota left?

`limit` / `limit_remaining` on the same `GET /key` response — **not** response headers.
OpenRouter's own docs state plainly: "Successful inference responses do not include
`X-RateLimit-*` headers... To monitor your remaining quota before hitting a limit, call
`GET /api/v1/key`." (Header-based rate-limit info only appears on a `429` rejection, which is a
transient error state, not a proactive quota signal — this app doesn't build a check around it for
that reason.) A `null` `limit` means "no per-key cap configured" and reports `ok`, not `unknown`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | declared unavailable |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## Icon

`assets/icon.svg` — the vendor's own `<link rel="icon">` (`https://openrouter.ai/favicon/glyph.png`,
confirmed live 2026-08-29) is a 512×512 PNG raster, not cleanly convertible to vector artwork, so
this follows the pack's documented fallback: simple-icons.

Taken from `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openrouter.svg` on 2026-08-29.

- **684 bytes** before re-framing, `<title>OpenRouter</title>`, `viewBox="0 0 24 24"`
- inked with `#94A3B8`, the hex simple-icons records for this brand (sourced from
  `https://openrouter.ai`)
- **no dark variant needed**: `_tools/icon-legibility.ts` reports 0 apps illegible in either theme
  for this mark
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the path data inside the
  nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-29 against `https://openrouter.ai/openapi.json` (77
documented paths) and the corresponding prose docs at `openrouter.ai/docs/api_reference/*`. Status
surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for
everyone at once.
