# Groq

Fast LLM inference, speech and batch processing via Groq's OpenAI-compatible API.

- **Categories** — ai
- **Auth methods** — api-key (bearer)
- **Actions** — 16
- **Egress allowlist** — `api.groq.com`
- **Website** — https://groq.com
- **API docs** — https://console.groq.com/docs/api-reference

## Not the same API as OpenAI — verified deltas

Groq's surface is OpenAI-*compatible*, not an OpenAI clone. Every detail below was checked
against Groq's own OpenAPI schema (extracted from `console.groq.com/docs/api-reference`,
2026-09-05) and a handful of live requests to `api.groq.com`, not assumed from the sibling
`apps/openai` / `apps/openrouter` apps in this pack.

- **Base path is `/openai/v1`, not `/v1`.** `https://api.groq.com/openai/v1/chat/completions`
  — OpenAI itself serves the same shape at a bare `/v1`. Getting this one string wrong is the
  single easiest way to burn an hour on this API.
- **Several OpenAI-shaped chat parameters do nothing.** Groq's schema documents
  `frequency_penalty`, `presence_penalty`, `logprobs`/`top_logprobs`, and `logit_bias` as "not
  yet supported by any of our models" (the request is accepted; the field is ignored), and `n`
  is fixed at 1. This app deliberately leaves all of them out of `chat-complete` rather than
  expose controls that silently do nothing.
- **Four Groq-only chat controls exist with no OpenAI equivalent:** `service_tier`
  (`auto`/`on_demand`/`flex`/`performance` — a latency/availability trade-off, not OpenAI's
  batch-processing tiers), `reasoning_effort`/`reasoning_format` (which values are legal
  depends on the *model* — e.g. `openai/gpt-oss-*` takes low/medium/high while qwen3 models
  take a different set, and an unsupported value gets a 400, not a silent ignore), and
  `search_settings`/`compound_custom` for Groq's "Compound" agentic models (built-in web
  search / code execution).
- **Model list splits into Production and Preview, and Preview can vanish without notice.**
  `console.groq.com/docs/models` explicitly warns Preview models "may be discontinued at
  short notice" and are "not [for] production environments" — a workflow hardcoding a preview
  model id is one Groq release away from a 404. `list-models` / `get-model` are the way to
  keep that choice a runtime decision.
- **Whisper accepts a `url` as an alternative to a file upload** — including a base64 data
  URL — in both `audio-transcribe` and `audio-translate`. OpenAI's own Whisper endpoint only
  ever takes a multipart file. This is a genuinely useful shortcut when the audio already
  lives somewhere reachable (skips buffering a multipart body through the sandbox), so both
  actions expose `file` and `url` as alternatives and require exactly one.
- **The Files API exists for exactly one purpose.** `purpose` has a single legal enum value,
  `batch` — unlike OpenAI's multi-purpose Files API (fine-tune, assistants, batch, vision).
  `files-upload` fixes it rather than exposing a one-option dropdown.
- **Batch is narrower than OpenAI's.** `endpoint` accepts only `/v1/chat/completions` (OpenAI's
  Batch API also takes `/v1/embeddings` and `/v1/completions`), so `batch-create` fixes it.
  `completion_window` is more flexible than OpenAI's fixed `24h`: Groq documents `24h` through
  `7d`.
- **Rate-limit headers are OpenAI-shaped and always present.** Same header names
  (`x-ratelimit-{limit,remaining}-{requests,tokens}`) and the same Go-style relative-duration
  format for the reset headers (`2m59.56s`, not a timestamp) — confirmed against
  `console.groq.com/docs/rate-limits`. Per that page, these are sent on **every** response,
  success or failure; `retry-after` only appears alongside an actual 429. `health/quota.ts`
  reuses the same duration parser as the sibling `apps/openai` app for exactly this reason.
- **The Responses (beta) endpoint is stateless.** It has OpenAI's Responses *shape* (a single
  `input` instead of `messages`, `instructions` instead of a system message) but not OpenAI's
  defining feature: server-side conversation state chained via `previous_response_id`. Groq's
  documented schema has no such field, and `store` only accepts `false`/`null`. `response-create`
  never sends either — every call is independent, same as `chat-complete`.

## Left out — real fields in Groq's schema with no documentation page

Groq's raw OpenAPI spec also lists `/openai/v1/embeddings`, `/openai/v1/reranking`,
`DELETE /openai/v1/models/{model}`, and a `/v1/fine_tunings` CRUD surface (note: no
`/openai` prefix — a different base path again). None of these appear in the site's own
navigation metadata, and their docs pages 404
(`console.groq.com/docs/embeddings`, `/docs/reranking`, `/docs/fine-tuning` all return 404,
checked 2026-09-05, while `/docs/text-to-speech`, `/docs/speech-to-text`, `/docs/batch`, and
`/docs/responses-api` are all live). Per this pack's rule to leave out anything that can't be
confirmed against real vendor docs, none of those four are implemented here.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `chat-complete` | perform | `POST /chat/completions` |
| `list-models` | read | `GET /models` |
| `get-model` | read | `GET /models/{model}` |
| `audio-transcribe` | perform | `POST /audio/transcriptions` |
| `audio-translate` | perform | `POST /audio/translations` |
| `audio-speech` | perform | `POST /audio/speech` |
| `files-upload` | perform | `POST /files` |
| `files-list` | read | `GET /files` |
| `files-retrieve` | read | `GET /files/{file_id}` |
| `files-download` | read | `GET /files/{file_id}/content` |
| `files-delete` | perform (idempotent) | `DELETE /files/{file_id}` |
| `batch-create` | perform | `POST /batches` |
| `batch-list` | read | `GET /batches` |
| `batch-get` | read | `GET /batches/{batch_id}` |
| `batch-cancel` | perform (idempotent) | `POST /batches/{batch_id}/cancel` |
| `response-create` | perform | `POST /responses` |

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://groqstatus.com> (`status.groq.com` 301-redirects here; both
confirmed live 2026-09-05).

```
GET https://groqstatus.com/api/v2/summary.json
```

A real Atlassian Statuspage — but an unusual one: most of its ~20 components are per-*model*
(`openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `whisper-large-v3`, ...), not per-endpoint.
There IS a plain `API` component and a `Website` component alongside them, and `health/service.ts`
keys its top-level state on those two specifically — a single degraded model shows up in
`components` (so "is this one model down" is still answerable) but never worsens the roll-up on
its own, since that would conflate "one model's backend is unhealthy" with "the API is down".

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

```
GET /openai/v1/models
```

An unsigned request returns a schema-correct `401` (`{"error":{"message":"Invalid API Key",
"type":"invalid_request_error","code":"invalid_api_key"}}` — verified live 2026-09-05), which
proves the host is reachable; `test` classifies liveness from that body/status, never assumes an
outage from a 401.

### Do we have quota left?

`x-ratelimit-{limit,remaining}-{requests,tokens}` headers, present on every response (see the
rate-limit note above).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `groqstatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because
the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load
time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-09-05 against Groq's own OpenAPI schema and live requests
to `api.groq.com` / `groqstatus.com`. Status surfaces and the model list move; re-verify if a
probe starts failing for everyone at once, or if a model id in a default disappears.
