# Jina AI

Generate embeddings, rerank search results, and run zero-/few-shot classification on the **Jina AI
Search Foundation API**.

- **Categories** — ai, developer-tools
- **Auth methods** — bearer-token
- **Actions** — 15
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:bearer-token`
- **Egress allowlist** — `api.jina.ai` (the `service` check adds `status.jina.ai` to its own hook
  allowlist, never to the app's)
- **Website** — https://jina.ai/
- **API docs** — https://jina.ai/api-dashboard/ (interactive) · https://api.jina.ai/openapi.json (spec)
- **Status page** — https://status.jina.ai/

> **Everything below was verified against Jina AI's own sources on 2026-09-06** — its
> machine-readable OpenAPI 3.1 document (`https://api.jina.ai/openapi.json`, 102,860 bytes,
> `info.version` `2026.07.27.1603`) and live probes (unauthenticated and with a syntactically valid
> but fake key) against `api.jina.ai` and `status.jina.ai`. Nothing here came from a third-party
> integration directory.

## What this app does NOT cover, and why

Jina AI is not one API — it's a family of products on **separate hosts**, and this OpenAPI document
covers exactly one of them:

| Product | Host | Covered here? |
|---|---|---|
| Embeddings / Rerank / Classify / Batch / Chat | `api.jina.ai` | **Yes — this app** |
| Reader (fetch a URL as clean LLM-ready text) | `r.jina.ai` | No — separate product, no spec found in this document |
| Search (web search for LLM grounding) | `s.jina.ai` | No — same |
| DeepSearch | (own endpoint) | No — same |

`status.jina.ai`'s own component list names `r.jina.ai` and `s.jina.ai` directly, which is exactly
how this gap was confirmed rather than assumed away — see `health/service.ts` for how the health
check is scoped to exclude them.

## Three things that would have cost someone a day

### 1. Three of the spec's own endpoints 404 in production

`GET /health`, `/ready` and `/live` are documented with no security requirement at all — the kind of
endpoint you'd reach for first as a cheap, no-credential health probe. Measured live, all three
answer:

```
HTTP/2 404
{"detail":"Invalid endpoint","request_id":"..."}
```

These are almost certainly Kubernetes-internal liveness/readiness routes that a FastAPI app mounts
unconditionally and that leaked into the public OpenAPI document by accident — not a real public
surface. Neither implemented as an action nor used by the `service` health check; see
[`lib/client.ts`](lib/client.ts) for the full write-up.

### 2. The error envelope has two incompatible shapes

Every documented error is typed as `ErrorResponse { detail: string, code?, request_id? }`, and that's
exactly what a 401 returns:

```json
{"detail":"Invalid API key. Verify your API key at https://jina.ai/api-dashboard/key-manager or generate a new one.","request_id":"...","code":"AUTH_INVALID_API_KEY"}
```

But a `404 RESOURCE_NOT_FOUND` and a bare `500 INTERNAL_ERROR` (both measured live) instead nest
`detail` as an **object**:

```json
{"detail":{"message":"Model 'not-a-real-model' not found or access denied. Verify the ID and your permissions.","code":"RESOURCE_NOT_FOUND"},"request_id":"..."}
```

Reading `body.detail` as a string unconditionally silently stringifies the second shape into
`"[object Object]"`. [`lib/client.ts`](lib/client.ts)'s `parseJinaError` normalizes both into one
`{status, message, code, requestId}` shape that every action and the auth `test` hook shares.

### 3. `POST /v1/classifiers` (list classifiers) answers 500 for every credential

Both the documented `GET` and `POST` forms of `/v1/classifiers` (which share the identical
`operationId: list_classifiers_v1_classifiers_post` — a strong signal the `GET` entry is a spec-
generation duplicate, not a real second route) returned `500 {"code":"INTERNAL_ERROR"}` for a missing
key, an invalid key, AND a syntactically-valid-but-fake key — the identical failure regardless of
credential state. That rules it out as this app's credential-liveness probe (a 500 tells you nothing
about the key) — see [`auth/bearer-token.ts`](auth/bearer-token.ts) for what was used instead
(`GET /v1/batches?limit=1`, which classifies `AUTH_MISSING_API_KEY` vs `AUTH_INVALID_API_KEY`
cleanly). `classifiers-list` is still implemented against the documented shape; a real, working key
may or may not see the same 500 — this app was built without one to test against, and surfaces
whatever comes back verbatim rather than hiding it.

## Actions

**Embeddings & reranking**
- `embeddings-create` — `POST /v1/embeddings`. The wire body is a discriminated union of eleven
  per-model schemas; every optional field (`task`, `dimensions`, `embedding_type`, `truncate`,
  `normalized`, `late_chunking`) is additive across all of them and only sent when set.
- `rerank` — `POST /v1/rerank`. `query` accepts an image (`{"image": "..."}`) for `jina-reranker-m0`,
  not just a string.

**Classification**
- `classify` — `POST /v1/classify`. One action covers both of the vendor's request shapes: give
  `model` + `labels` for zero-shot classification, or `classifierId` for a trained classifier
  (few-shot). See `input` in the code comment for the accepted shapes.
- `classifier-train` — `POST /v1/train`. Creates a new classifier from labeled examples (`model` +
  `input`) or adds examples to an existing one (`classifierId` + `input`).
- `classifiers-list` — `POST /v1/classifiers`. See finding #3 above.
- `classifier-delete` — `DELETE /v1/classifiers/{id}`.

**Models** (no credential required — the spec marks both `security: null`, confirmed live)
- `models-list` — `GET /v1/models`.
- `model-get` — `GET /v1/models/{model_id}`.

**Chat (vendor-labelled experimental)**
- `chat-completions` — `POST /v1/chat/completions`. The vendor's own summary says
  "(Experimental)... We do not guarantee its availability, scalability, or production-readiness." The
  OpenAPI operation declares **no request body schema at all** — not even an untyped placeholder —
  so this action accepts a raw JSON body (typically OpenAI-style `{model, messages, ...}`) and sends
  it verbatim rather than pretending to validate against a schema that doesn't exist.

**Batch embedding jobs** (async bulk processing over inline or file-hosted JSONL)
- `batch-embeddings-create` — `POST /v1/batch/embeddings`. Requires exactly one of `inputUrl` (a
  GCS/S3/HTTP JSONL file) or `input` (inline lines for small batches).
- `batch-get` — `GET /v1/batch/{id}`.
- `batch-cancel` — `DELETE /v1/batch/{id}`.
- `batches-list` — `GET /v1/batches`.
- `batch-output-get` — `GET /v1/batch/{id}/output`. Returns raw JSONL text (newline-delimited JSON is
  not one parseable JSON document).
- `batch-errors-get` — `GET /v1/batch/{id}/errors`. Same shape as output.

## Auth

**Bearer token** (`auth/bearer-token.ts`) — `Authorization: Bearer jina_<key>`, from
[jina.ai/api-dashboard/key-manager](https://jina.ai/api-dashboard/key-manager). No OAuth surface
exists for third-party apps.

The credential-liveness probe is `GET /v1/batches?limit=1`, chosen because it (a) requires a
credential and classifies missing-vs-invalid cleanly via the vendor's own `code` field
(`AUTH_MISSING_API_KEY` / `AUTH_INVALID_API_KEY`), (b) costs no tokens — listing batch job history
triggers no inference, unlike every embeddings/rerank/classify call, and (c) returns no credential
material (batch statuses and a short-lived signed `output_url` for a job's own PRIOR output, never
the API key). See the file for why `/v1/classifiers` was rejected instead.

## Health checks

- **`service`** (`kind: service`) — reads `status.jina.ai`, a genuine, claimed Atlassian Statuspage
  (`page.id: nldp3ndmy0vf`, `page.name: "Jina AI"`, verified live). Scoped to the **Embedding Models**
  and **Reranker Models** component groups plus the standalone `jina-vlm` component — the page also
  names `r.jina.ai` and `s.jina.ai` (Reader/Search), which this app has no actions for and therefore
  does not report on.
- **`quota`** (`kind: quota`) — reads `X-RateLimit-Remaining-Requests` / `X-RateLimit-Remaining-Tokens`
  off the same batches-list call the credential probe already makes. These headers are documented in
  the spec's own prose, but were **never observed** on any response captured while building this app
  (every 401, the 404, the public `/v1/models` 200) — plausibly because they only attach to a request
  from a valid, working key, which this app was built without. Reports `unknown` when absent rather
  than asserting a shape nobody has confirmed live.
- **`auth:bearer-token`** — derived automatically from the `test` hook above.

## Icon

Jina AI's own mark — a four-dot "j" glyph — taken verbatim from `x-logo.url` in the vendor's own
OpenAPI document (`https://jina.ai/Jina%20-%20Light.svg`, confirmed live, `image/svg+xml`, 663 bytes).

## Deliberately left out

- **Reader, Search and DeepSearch** — separate hosts (`r.jina.ai`, `s.jina.ai`) with no OpenAPI
  document found to verify against. See "What this app does NOT cover" above.
- **`/health`, `/ready`, `/live`** — documented but 404 live in production. See finding #1 above.
- A fixed `model` enum on every embedding/rerank/classify action — Jina ships new models regularly
  (11 embedding-family model IDs alone at spec time); `model` is left as free text with a hint
  listing the current common ones, and `models-list`/`model-get` are the actions to discover the
  live, current catalog.
