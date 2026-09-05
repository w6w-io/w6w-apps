# Gamma

Generate presentations, documents, webpages, and social posts with Gamma's AI, and manage what it
produces — on the **Gamma Public API v1.0**.

- **Categories** — ai, productivity, documents
- **Auth methods** — api-key
- **Actions** — 20
- **Health checks** — 1 (`service`) + the derived `auth:api-key`
- **Egress allowlist** — `public-api.gamma.app` (the `service` check reads a feed from
  `status.gamma.app`, added to that hook's own allowlist implicitly — never to the app's)
- **Website** — https://gamma.app/
- **API docs** — https://developers.gamma.app/
- **Status page** — https://status.gamma.app/

Gamma turns a topic, an outline, or an existing document into a polished presentation, document,
webpage, or social post. Its API is asynchronous end to end: you start a job, poll it, and collect a
`gammaUrl`/`exportUrl` once it completes — the same three-beat shape for both text-to-Gamma and
standalone image generation.

> **Everything below was verified against Gamma's own developer docs on 2026-09-05** — every action's
> request/response fields were read off the OpenAPI 3.0 fragment embedded in that endpoint's own
> Mintlify page, not inferred or copied from a third-party integration directory.

## Findings worth knowing

### 1. The Mintlify `.md`-suffix trick

`developers.gamma.app` is a Mintlify-hosted docs site. Appending `.md` to any page URL
(`.../generations/create-generation.md`) returns the raw markdown **including an embedded OpenAPI 3.0
JSON fragment** for that endpoint, instead of the rendered HTML. `https://developers.gamma.app/llms.txt`
is the index of every real page; fetching the `.md` form of each one gave a complete, machine-readable
reading of the surface — base URL, auth header, every path/verb/field/enum — without ever screen-
scraping rendered HTML.

### 2. The icon host is neither the API host nor the docs' own apex domain

The apex `gamma.app` **bot-blocks a direct fetch** (measured `403`) — you cannot pull brand assets
from it directly. The icon this app ships (`assets/icon.png`, 180×180) was found by reading
`developers.gamma.app`'s own `<head>` for `<link rel="apple-touch-icon">`, which points at a
GitBook-hosted asset URL (`developers.gamma.app/~gitbook/image?url=...`). That host is not the API
host either — it never appears in `network.allow`, because nothing at runtime calls it.

### 3. Gamma really does publish a status page, and it needs feed-log discipline

`status.gamma.app` is a real, live Instatus page (self-identifying as `"Gamma App"`, `status: "UP"` in
its own `summary.json`) — not an unclaimed-host decoy. Its incident history (`history.atom`) names
this app's own "API" component alongside "Web Application", "Multiplayer" and "AI".

Unlike a Statuspage.io feed (one entry per *update*), an Instatus entry accumulates a whole incident's
history in ONE description, appending a `"<date> - <Status> - <message>"` line per update. So the
"is this incident still open" question is answered by the **last** such line in the entry, not the
first — [`health/service.ts`](health/service.ts) extracts and reads that terminal token rather than
guessing from prose, and treats an entry with none of Instatus's known tokens as still-open (never
guesses "resolved").

### 4. Only one auth method is implemented

`get-started/authenticate-with-oauth.md` documents an OAuth 2.0 authorization-code flow as an
alternative to an API key, for third-party apps acting on behalf of their own users' Gamma accounts.
This app implements only `X-API-KEY`: it is what the vendor's own quick-start recommends for a
direct/Zapier/Make/n8n-style integration, it covers every documented endpoint (a handful of
management/analytics routes additionally accept an OAuth Bearer token, but never *require* it), and
it needs no redirect URI or per-installation OAuth app registration.

### 5. `folderIds`/`gammaId` shapes, simplified deliberately

`folderIds` accepts **at most one** entry per the schema (`maxItems: 1`) on every generation endpoint,
so the two generation actions expose a single `folderId` string param and wrap it into the one-element
array Gamma expects, rather than a misleadingly-repeatable list field.

The deeply nested option groups (`textOptions`, `imageOptions`, `cardOptions`, `sharingOptions`, and
the multi-page `pages` array) are exposed as raw JSON params rather than one form field per leaf —
`cardOptions.headerFooter` alone has six independently-typed positions. Flattening every leaf into its
own conditionally-shown param would need dozens of fields most calls never touch; JSON keeps every
documented field reachable without that.

## What's covered

| Group | Actions |
| --- | --- |
| Generations | Create Generation, Get Generation Status, Create Generation From Template |
| Images | Create Image Generation, Get Image Generation Status, Archive Image |
| Workspace | List Themes, List Folders |
| Management | Search Gammas, Search Templates, Get Gamma, List Gamma Comments, Archive Gamma, Export Gamma, Get Export Status, Delete Gamma |
| Analytics | Get Gamma Analytics, Get Gamma Card Analytics, Get Gamma Viewer Analytics, Get Gamma Viewer Detail Analytics |

## What's deliberately left out

- **OAuth 2.0 Bearer auth** — see finding 4 above.
- **A quota/credits health check.** Credit balance (`credits.deducted`/`credits.remaining`) is only
  ever returned inside a generation/image/export status response — there is no free, side-effect-free
  endpoint to poll it on a schedule, so this app doesn't fabricate one.
- **MCP server setup** (`mcp/gamma-mcp-server.md`, `mcp/mcp-tools-reference.md`) — a separate product
  surface (Gamma's own MCP server for AI tool connectors), not a REST endpoint this app can wrap.

## Health check

`service` reads `status.gamma.app`'s Atom feed and reports `degraded` while any incident's terminal
status line is not `Resolved`, `ok` otherwise. It never reports `down` — Gamma's status feed carries
no severity gradient beyond "there's an open incident" — and never reports `unknown` unless the feed
itself is unreachable. The credential check (`auth:api-key`, derived from `auth/api-key.ts`'s `test`)
probes `GET /themes`, which needs no more permission than an ordinary workspace member has, so a
narrowly-scoped key still reports healthy.

## Errors

Every Gamma failure is `{"message": string, "statusCode": number}`. `formatGammaError` in
[`lib/client.ts`](lib/client.ts) surfaces the vendor's own message verbatim and adds an actionable
sentence for `402` (out of credits) and `429` (rate limited), because "check your input" is the wrong
fix for either.
