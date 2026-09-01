# Exa

AI-native web search, content retrieval, and answers via Exa.

- **Categories** — search, ai
- **Auth methods** — api-key
- **Actions** — 9
- **Egress allowlist** — `api.exa.ai`
- **Website** — https://exa.ai
- **API docs** — https://docs.exa.ai (canonical URL is now `https://exa.ai/docs`, which
  `docs.exa.ai` 307-redirects to)

## API surface

```
Base URL:  https://api.exa.ai
Auth:      x-api-key: <key>   (Authorization: Bearer <key> also accepted)
```

Confirmed against Exa's own machine-readable OpenAPI 3.1 document at
`https://exa.ai/docs/exa-spec.json` — fetched 2026-09-01. That file is **not** linked
from the docs nav and is **not** at either guessable path
(`docs.exa.ai/reference/openapi.json`, `docs.exa.ai/openapi.json` both 307/404); it
sits under the *rendered* docs site's own root instead. It backs every hand-written
`/reference/*` page (each embeds the relevant operation's schema, extracted from this
same file, in a Next.js RSC payload) and is the source of truth this app was built
against — not a blog post, an SDK's TypeScript types, or a sibling app.

## Things that would cost someone a day

- **`livecrawl` is deprecated.** Nearly every third-party Exa tutorial and older SDK
  example uses `livecrawl: "preferred" | "always" | ...` for freshness control. The
  current spec marks it deprecated ("does not guarantee freshly fetched parser output
  ... use `maxAgeHours` instead") and a request combining both is undefined behavior.
  This app only exposes `maxAgeHours` (`0` = force a fresh crawl, `-1` = always use
  cache, omit = fallback).
- **`type: "neural" | "keyword"` no longer exist.** Search mode is now
  `auto | fast | instant | deep-lite | deep | deep-reasoning`, with `auto` as the
  default. The two mode names that show up in most existing Exa content are silently
  accepted as opaque strings by the JSON schema (nothing rejects them) and then
  ignored server-side — there's no error to catch the mistake.
- **Every `/search` call is billed** ($0.007–$0.015 per the spec's own
  `x-payment-info`, and `/answer` similarly per its worked example), so a live search
  is the wrong choice for a connect-time credential check or a periodic health probe —
  it would spend real money on every check. `GET /v0/teams/me` (team name/id, plus
  concurrency usage and limits) is free account metadata, needs no scope beyond an
  authenticated key, and never echoes the key back — this app uses it for the Auth
  `test` hook and both health checks that need a credential.
- **The "Research" API in older docs/tutorials is gone.** `/reference/research/create-a-task`
  404s, and there is no `research` tag anywhere in the current OpenAPI spec. Exa's
  current ongoing-entity-search surface is **Websets** (`/v0/websets/*`), which this
  app covers instead.
- **No account/credits/balance endpoint exists.** Exa is pay-as-you-go per request, and
  running out surfaces only as a 402 with tag `NO_MORE_CREDITS` /
  `API_KEY_BUDGET_EXCEEDED` / `TEAM_BUDGET_EXCEEDED` on the *next* billed call — never as
  a queryable balance beforehand. Declared `unavailable` in `health/credits.ts` rather
  than guessed at.

## Health check

Three different questions, kept apart on purpose: is the *vendor* up, is *this
credential* live, and is there *headroom* left.

### Is the vendor up?

`status.exa.ai` is a **custom** status page (Vercel-hosted Next.js — not Atlassian
Statuspage, Instatus, or Better Stack). Verified 2026-09-01:

- `GET /api/v2/summary.json` → `{"page":{"name":"Exa","url":"https://status.exa.ai","status":"UP"}}`
  — real JSON, self-identifies as Exa, but no component detail.
- `GET /api/v2/components.json` → a real component tree naming Exa's own products
  (`Search API` with `People`/`Default` children, `Websets`, `Exa MCP`). `health/service.ts`
  reads this one.
- No incident history or Atom/RSS feed exists to declare via `feed:` —
  `/api/v2/incidents.json`, `/history.rss` and `/feed` are all genuine 404s/redirects,
  not decoys.

Only `OPERATIONAL` has been observed live; any other status string is treated as
`degraded` rather than guessed as `down`, since the vendor documents no status
vocabulary to check it against.

### Is this credential live?

The Auth `test` hook — `GET /v0/teams/me`. Free, needs no scope, never echoes the key.

### Is there headroom left?

Two checks, because Exa exposes exactly one metered dimension for reading in advance
and explicitly nothing for the other:

- **`quota`** (real probe) — `GET /v0/teams/me`'s `concurrency`/`limits` fields:
  active/queued requests against this team's concurrency ceiling.
- **`credits`** (declared absent) — no endpoint anywhere in the spec reports a prepaid
  dollar/credit balance; the only cost signal is each response's own after-the-fact
  `costDollars`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `GET status.exa.ai/api/v2/components.json` |
| `quota` | quota | connection | signed | degraded (default) | `GET /v0/teams/me` concurrency/limits |
| `credits` | quota | connection | signed | informational | `unavailable` — no credits/balance endpoint documented |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `search` | search | `POST /search` |
| `find-similar` | search | `POST /findSimilar` |
| `get-contents` | read | `POST /contents` |
| `answer` | perform | `POST /answer` |
| `create-webset` | perform | `POST /v0/websets` |
| `get-webset` | read | `GET /v0/websets/{id}` |
| `list-websets` | search | `GET /v0/websets` |
| `delete-webset` | perform | `DELETE /v0/websets/{id}` |
| `list-webset-items` | search | `GET /v0/websets/{webset}/items` |

`search`, `find-similar` and `get-contents` share their result-filter and
content-extraction params (`lib/params.ts`) — note that `/contents` merges those
options at the request **root**, while `/search` and `/findSimilar` nest them under a
`contents` key; the OpenAPI spec's `allOf`/property shape differs between the two and
both actions/tests encode that distinction explicitly rather than assuming they match.

### Deliberately not built

- **Monitors, batches, webhooks, imports, events, and the Agent API
  (`/agent/runs/*`).** All real, documented endpoints, but out of scope for this pass
  to keep the action set to Exa's core "search the web, get an answer, run an ongoing
  entity search" surface. Websets itself is covered only at the level of
  create/get/list/delete a Webset plus listing its items — `enrichments` (extracting
  extra fields per item) is exposed as a raw JSON passthrough on `create-webset` rather
  than built out into its own actions, and Webset `searches`/imports/monitors are left
  out entirely.
- **`context` action** (`/reference/context`, "Exa Code" — code-snippet search across
  open-source repos). Not in the OpenAPI spec's path list at all (checked: 42 paths,
  none of them `/context`), so there's nothing to ground an action in.

---

Researched and endpoint-verified 2026-09-01 against `https://exa.ai/docs/exa-spec.json`
(Exa's own OpenAPI 3.1 document, 42 paths) and live probes of `api.exa.ai` and
`status.exa.ai`. Status/quota surfaces move; re-verify before wiring either health
check further if a richer machine-readable option shows up later.
