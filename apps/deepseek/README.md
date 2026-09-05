# DeepSeek

Chat completions, FIM code completion, model listing and account balance via the DeepSeek API.

- **Categories** — ai
- **Auth methods** — api-key (bearer)
- **Actions** — 4
- **Egress allowlist** — `api.deepseek.com`
- **Website** — https://deepseek.com
- **API docs** — https://api-docs.deepseek.com/api/

## Verified against the vendor docs, not assumed from a sibling app

DeepSeek's chat surface is OpenAI-Chat-Completions-*shaped*, but every endpoint, field and
model id below was fetched and checked against `api-docs.deepseek.com`'s own OpenAPI-generated
reference pages (2026-09-05), not copied from the sibling `apps/openai` / `apps/groq` /
`apps/mistral` apps in this pack. Three findings would each have cost a day if assumed instead:

- **The model line has been renamed since this pack's other LLM apps were researched, and will
  likely be renamed again.** The current documented ids are `deepseek-v4-flash`,
  `deepseek-v4-pro` and `deepseek-v4-flash-vision-exp` — not `deepseek-chat` /
  `deepseek-reasoner`, the naming this app's own research initially expected from prior
  knowledge of this vendor. Because of that history, `chat-complete`'s `model` param ships
  **without a hardcoded default** — it points at the `list-models` action instead, which is the
  one part of the surface that cannot go stale.
- **`GET /favicon.svg` (the root one) is not the icon — it 200s with the wrong content.** The
  request returns HTTP 200 with `content-type: text/html` and a byte count identical to the
  docs homepage: it's the SPA's catch-all shell, not an SVG, despite the 200. The real mark is
  at `GET /img/favicon.svg` (`content-type: image/svg+xml`, DeepSeek's blue `#4D6BFE` whale).
  A pure status-code check would have shipped the wrong (non-existent) icon.
- **DeepSeek's own marketing site links a status page with no usable API, but a different,
  older page that IS real and API-backed still exists and is still being updated.**
  `deepseek.com`'s footer links `status.deepseek.com`, a client-rendered Next.js SPA where
  every JSON-shaped path (`/api/v2/summary.json`, `/index.json`, ...) answers 200 with the
  identical ~120KB app shell — the classic catch-all-HTML signature, so treated as unusable.
  Separately, `deepseek.statuspage.io` is a genuinely DeepSeek-operated Atlassian Statuspage
  (named components describing `api.deepseek.com` and `chat.deepseek.com` specifically, in
  Chinese and English — not the generic defaults an unclaimed decoy carries) with real incident
  history through 2026-05-08. `health/service.ts` reads that one instead, since it is the only
  surface with an actual API.

Two more, smaller, deltas worth knowing:

- **No rate-limit headers of any kind.** `quick_start/rate_limit` documents a per-account
  *concurrency* ceiling (500-2500 depending on model) that returns a plain `429` when exceeded,
  with no `x-ratelimit-*`-shaped header on any response — unlike OpenAI/Groq/Mistral, which all
  expose remaining-requests/tokens headers. `quota` therefore reads the account **balance**
  (`GET /user/balance`) instead of a header, which is also a genuinely different signal: running
  out of balance stops every call outright rather than merely throttling it.
- **`402` is a distinct, documented error code meaning "Insufficient Balance"** — separate from
  `401` (bad key) and `429` (rate limit). `lib/client.ts`'s thrown error message always carries
  the numeric status so a workflow's error branch can tell a spent account apart from a bad key.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `chat-complete` | perform | `POST /chat/completions` |
| `fim-complete` | perform | `POST /beta/completions` |
| `list-models` | read | `GET /models` |
| `get-balance` | read | `GET /user/balance` |

`chat-complete` supports DeepSeek's thinking-mode controls (`thinking: { type }`,
`reasoning_effort: low\|high\|max` — DeepSeek's own three-value scale, distinct from
OpenAI's or Groq's), JSON mode, tool calls and log probabilities. `frequency_penalty` /
`presence_penalty` are documented as accepted-but-ignored no-ops and are deliberately left out,
same as this pack's `apps/groq` does for its own no-op fields. Streaming (`stream: true`) is not
modeled — this action always returns the fully-materialized response.

`fim-complete` is DeepSeek's Beta Fill-In-the-Middle endpoint, reached at `/beta/completions` on
the **same host** (`api.deepseek.com/beta`), so it needs no extra `network.allow` entry. Model
support for FIM is narrower and has already shifted between two of DeepSeek's own doc pages, so
`model` is left as free text rather than a fixed enum.

DeepSeek publishes no embeddings or moderation endpoint (checked its full sitemap), so neither
appears here — nothing is guessed in to round out the surface.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *balance* left.

### Is the vendor up?

**Service status** — `deepseek.statuspage.io` (see the findings above for why this is used
instead of the newer, unlinked-API `status.deepseek.com`).

```
GET https://deepseek.statuspage.io/api/v2/summary.json
```

A real Atlassian Statuspage with two named components (API service, web-chat service) and real
incident history. `health/service.ts` reads the page-level indicator and per-component status
the same way this pack's `apps/anthropic` / `apps/groq` do.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself.

```
GET /models
```

Lists models. Cheap, and does not echo the credential back.

### Do we have balance left?

```
GET /user/balance
```

Returns `{ is_available, balance_infos: [{ currency, total_balance, granted_balance,
topped_up_balance }] }` — no credential material, confirmed against the vendor's own schema
page. `quota` reports `down` when DeepSeek itself says `is_available: false`, and otherwise
`ok` with the balance for visibility; there is no vendor-documented percentage-of-cap to turn
into a `degraded` threshold, so this check does not invent one.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `deepseek.statuspage.io` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

## Icon

`assets/icon.svg` — DeepSeek's whale mark in its brand blue (`#4D6BFE`).

Source: `https://api-docs.deepseek.com/img/favicon.svg` (NOT the root `/favicon.svg` — see the
findings above), fetched 2026-09-05, 3652 bytes, `image/svg+xml`. Re-framed onto the pack's
square canvas by `_tools/icon-normalize.ts`; the artwork inside the nested `<svg>` is the
vendor's, verbatim.

---

Researched and endpoint-verified 2026-09-05 against `api-docs.deepseek.com`'s own OpenAPI
reference pages and live requests to `api.deepseek.com` / `deepseek.statuspage.io`. The model
list and status surfaces move; re-verify if a probe starts failing for everyone at once, or if
`list-models` stops returning the ids this README names as examples.
