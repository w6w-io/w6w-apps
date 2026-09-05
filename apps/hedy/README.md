# Hedy

Read meeting sessions (transcript, recap, structured minutes) and the AI-extracted highlights
inside them, from **Hedy's REST API**.

- **Categories** — ai, productivity, communication
- **Auth methods** — api-key
- **Actions** — 4
- **Health checks** — 2 (~~`service`~~, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.hedy.bot`
- **Website** — https://hedy.ai/
- **API spec** — https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1

> **Everything below was verified against Hedy's own OpenAPI 3.0.0 document
> (`https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1`) and live probes against `api.hedy.bot`
> on 2026-09-05.** Nothing here came from a third-party integration directory.

## The three things worth knowing before touching this app

### 1. The API host did not follow the rebrand

The marketing site moved from `hedy.bot` to `hedy.ai` (the old domain now redirects), but the API
host never moved. `api.hedy.ai` is **NXDOMAIN** — the OpenAPI document's one declared server is
`https://api.hedy.bot/`, which CNAMEs to a Firebase-hosted `hedy-api.web.app`. This app only ever
calls `api.hedy.bot`, and it is the only host in `network.allow`.

### 2. Live behaviour is cleaner than an earlier note about this API suggested

Before writing this app, the guidance handed down was "unauthenticated probes return 404, not
401 — don't mistake a 404 for a dead endpoint." Live testing on 2026-09-05 found the opposite is
now true for both documented resources:

| Request                                  | Status | Body                                                                    |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `GET /sessions` / `GET /highlights`, no key | **401** | `{"success":false,"error":{"code":"missing_api_key","message":"Missing API key"}}` |
| Same, with a syntactically wrong key      | **401** | `{"success":false,"error":{"code":"invalid_api_key","message":"Invalid API key format"}}` |
| `GET /v1/sessions`, `GET /foo-bar-baz` (genuinely unknown routes) | **404** | plain Express `Cannot GET <path>` HTML — not this API's JSON shape at all |
| Any request, once the (short, ~60s) rate window is spent | **429** | `{"success":false,"error":{"code":"rate_limit_exceeded", …}}` per spec |

So a 404 from this API really does mean "wrong path" — it is never how a bad or missing credential
shows up. `auth/api-key.ts` classifies by `error.code`, not by status alone, both because that is
the rule this pack always follows and because it is what keeps a future 404 (a typo'd path) from
ever being misread as a credential problem.

One more live finding, not in the spec: every response — authenticated, unauthenticated, or
failing — carries `x-ratelimit-limit` / `-remaining` / `-reset` headers. Measured: `limit=200`,
decrementing per call, `reset` a Unix timestamp only ~60 seconds out — a short rolling window, not
the "per hour" the header name alone might suggest. `health/quota.ts` reads it.

### 3. Webhooks is a tag with no paths

The OpenAPI document declares three tags — Sessions, Highlights, Webhooks — but every operation in
it is filed under Sessions or Highlights. **Nothing is documented under Webhooks at all.** Per this
pack's rule against guessing an endpoint from a tag name, this app covers reads only and does not
invent a webhook-management action.

## Auth

One method: `api-key`, type `apiKey`, header `Authorization: Bearer <key>` — exactly
`components.securitySchemes.ApiKeyAuth` in the spec (`type: apiKey`, `in: header`,
`name: Authorization`, description "Add 'Bearer ' followed by your API key").

### The probe is `GET /sessions?limit=1`

Hedy's document names no dedicated ping or whoami operation. Of the two real resources,
`GET /sessions` is the cheapest read: it needs a credential, and its response —
`{"success":true,"data":[...],"pagination":{...}}` — never echoes the key itself, unlike a
whoami-shaped endpoint that hands back the caller's own credential (the trap this pack has hit
with Follow Up Boss's `/me` and Mailjet's `/apikey`). `limit=1` keeps the call at the documented
minimum.

`test()` reads `error.code` from the body rather than trusting the HTTP status alone (see finding
2 above), and treats a `429` as inconclusive rather than as proof of a bad key — the same
rate-limit headers appear on calls with no key at all, so the limiter sits in front of key
validation and a 429 says nothing about whether the key is good.

## Actions

4 actions, read-only — this app has no `perform` action, because nothing under Sessions or
Highlights is documented as a write, and Webhooks publishes no paths to write to at all.

| Key                | Type   | Endpoint                          |
| ------------------ | ------ | ---------------------------------- |
| `sessions-list`     | search | `GET /sessions`                    |
| `session-get`       | read   | `GET /sessions/{sessionId}`        |
| `highlights-list`   | search | `GET /highlights`                  |
| `highlight-get`     | read   | `GET /highlights/{highlightId}`    |

Both list actions accept a `limit` param (vendor default 50, maximum 100) and return
`{items, hasMore, next, total}` — `hasMore`/`next`/`total` come straight from the vendor's
`pagination` object. Both detail actions take the resource's `id` (from the corresponding list
action) and return the full record: `session-get` is the only place `transcript`, `conversations`
and `meeting_minutes` appear (the list only carries `recap`); `highlight-get` is the only place
`rawQuote`, `timeIndex` and `aiInsight` appear (the list only carries `cleanedQuote` and
`summary`).

## Health checks

Two declared checks plus the derived `auth:api-key`.

### ~~`service`~~ — a declared absence, at `informational` severity

One candidate was found and rejected. `https://hedy.statuspage.io/api/v2/summary.json` answers
`200` with real JSON — `page.name` is literally `"Hedy"`, so this is not one of the
unclaimed-Statuspage decoys this pack has hit before (those answer ~127,700 bytes of HTML, not
JSON). But its two components are `"API (example)"` and `"Management Portal (example)"` — the
exact placeholder names Statuspage seeds a freshly created, never-configured page with — and
`status.indicator` is permanently `"none"`. A page can be genuinely claimed and still carry zero
real signal; reporting it would be free-floating default content, not evidence about this API.
`hedyai.statuspage.io` (the current brand name) redirects to the generic `statuspage.io` marketing
page instead of resolving to a claimed page at all. No RSS/Atom feed or other machine-readable
source was found for either `hedy.ai` or `hedy.bot`.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
`unknown` outranks `ok` in the roll-up, and at any other severity this would pin the app's verdict
at `unknown` forever.

### `quota` — a live probe, because request-rate headroom *is* readable

Every response carries `x-ratelimit-limit` / `-remaining` / `-reset` (Unix timestamp), including
unauthenticated ones — measured live, not documented in the spec. This check reads them off the
same `GET /sessions?limit=1` call the auth probe already makes, so the added cost is zero extra
requests once both checks share a cache window. `remaining <= 0` or `>= 90%` consumed reports
`degraded`, never `down`: the window recovers on its own roughly every 60 seconds, so this is a
queue, not an outage.

## Icon

`assets/icon.png` is Hedy's own mark, downloaded **verbatim** from `https://hedy.ai/favicon.png`
(the URL in the site's own `<link rel="icon">` tag, not a guessed path) — 96×96, 8-bit RGBA PNG,
9,822 bytes.

## Layout

```
hedy/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/client.ts             # HedyClient: envelope unwrap, error formatting, rate-limit headers
├── auth/api-key.ts           # apiKey: sign, test (GET /sessions?limit=1)
├── actions/                  # one file per action (4)
├── health/
│   ├── service.ts            # declared absence, informational
│   └── quota.ts              # x-ratelimit-* headers, signed
├── assets/icon.png           # vendor mark, verbatim
└── tests/                    # entry module, every action, auth, health
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
