# Airtop

Drive real, cloud-hosted Chromium sessions with Airtop's AI browser automation: create sessions and
windows, load and interact with pages using natural-language element descriptions, and extract or
summarize what's on the page.

- **Categories** — ai, developer-tools
- **Auth methods** — api-key
- **Actions** — 24
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.airtop.ai` (the `service` check adds `status.airtop.ai` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.airtop.ai/
- **API docs** — https://docs.airtop.ai/
- **OpenAPI** — https://api.airtop.ai/api/openapi.json
- **Status page** — https://status.airtop.ai/ (Instatus, not Statuspage)

> **Everything below was verified against Airtop's own sources on 2026-09-01** — its machine-readable
> OpenAPI 3.1.0 document (`https://api.airtop.ai/api/openapi.json`, 529,210 bytes, `info.title`
> "Browser Control API"), and live probes against `api.airtop.ai` and `status.airtop.ai`. Nothing here
> came from a third-party integration directory or from memory of a similar vendor.

## What this app covers, and what it deliberately leaves out

Airtop's OpenAPI document tags every operation with `x-fern-audiences`. Only `public`-tagged
operations are implemented: **Sessions** (create/list/get/terminate/save-profile-on-termination),
**Windows** (create/list/get/close/load-url), the ten **AI-driven page interactions** (click, hover,
type, scroll, screenshot, scrape-content, page-query, paginated-extraction, summarize-content,
file-input), **Profiles** (delete — the only public profile endpoint), and **Files** (list/get/delete).

Four things are left out, deliberately, rather than guessed at:

1. **The `v2` `act`/`extract`/`find-one`/`find-many`/`navigate`/`wait-for-page`/`llm` interface**
   (`POST /v2/sessions/{id}/windows/{id}/...`). This is tagged `beta`, and — checked by reading
   `required` on every one of its request schemas — **every single operation requires a `jobId`**
   ("the id of the job to which this operation belongs"). Nothing in the public surface creates a
   job or a `jobId`; the only place that concept appears is Airtop's own `Agents` product
   (`/v2/agents/...`, tagged `alpha`). Rather than fabricate a `jobId`, this whole group is left out.
   Worth knowing even if you reach for it elsewhere: called synchronously, these endpoints still only
   answer `{requestId}` — the actual result is fetched separately via
   `GET /v2/requests/{requestId}/status`, which this app also does not implement (it would only ever
   be polling a request this app cannot create).
2. **`Agents` / `GTM Engineer` / `Knowledge Base` / `Team Vault` / `Sensitive Values` /
   `Agent Folders`** (`/v2/agents/...`, `/v1/gtm-engineer/...`,
   `/v2/organizations/.../knowledge-base`, `/v2/team-vault-entries`, `/v2/sensitive-value-entries`,
   …). Every operation under these ~145 paths is tagged `alpha` — Airtop's own internal product
   surface (its no-code agent builder), not a target for third-party integration.
3. **Two-phase file upload.** `POST /v1/files` returns an `uploadUrl` the caller must `PUT` bytes to
   directly — a *per-file* host this app cannot pre-declare in `network.allow` (`ctx.fetch` is
   allowlist-restricted; a wildcard `"*"` is reserved for user-supplied-host apps, which this one
   isn't). `file-list` / `file-get` / `file-delete` cover the read/delete side of the Files API;
   creating and completing an upload is left out.
4. **Form-filling and composite actions** (`fill-form`, `create-form-filler`, `analyze-form-state`,
   `browser-use`, `computer-use`, `web-archive`, `identify`, `monitor`, and the whole
   `/v1/async/sessions/.../windows/...` mirror of the ten interactions above). These are real and
   `public`-tagged, but `fill-form` branches across strategies this app does not otherwise implement
   (`automation`, `computerUse`/Gemini, Claude Code, Codex) and the async mirror exists only to be
   polled via `GET /v1/requests/{requestId}/status` for calls this app already makes synchronously —
   left out rather than modeled speculatively.

## The three things most likely to cost someone a day

### 1. `outputSchema` is a string, not an object

Every AI interaction that accepts one (`page-query`, `paginated-extraction`, `summarize-content`)
documents it as `type: "string"` in the OpenAPI schema — a **serialized JSON Schema document**, not a
JSON object. Passing an object where the vendor's client expects a string is exactly the kind of thing
that answers `200` with a subtly-wrong response shape rather than an error. This app's `outputSchema`
params use `type: "code"` (a raw-text field) rather than `type: "json"` for this reason.

### 2. The response shape is NOT the same across every AI interaction

Nine of the ten AI-driven window interactions answer `data.modelResponse` as a **text string** (an
answer, a confirmation, a summary). Two don't:

- **`scrape-content`** answers a **structured object**
  (`{scrapedContent: {text, contentType}, title, selectedText}`) at that same `data.modelResponse`
  key — confirmed from `ScrapeResponseOutput`'s own schema, which requires `scrapedContent` and
  `title`. Treating it as a string (the obvious reading, given every sibling endpoint) silently
  produces `"[object Object]"` or a raw JSON blob depending on the caller's language.
- **`screenshot`** answers an essentially empty `modelResponse`. The image itself lives at
  **`meta.screenshots[0]`** (`dataUrl` for base64, `signedDownloadUrl` for the URL format) — under
  `meta`, not `data`, because the vendor's metadata object is shared across every AI interaction and
  happens to be where it put per-call artifacts like screenshots and credit usage.

`lib/client.ts`'s `aiRequest()` handles the common (string) case and stringifies anything else so a
caller relying on it never crashes; `window-scrape-content.ts` and `window-screenshot.ts` read their
own shapes directly instead of going through it.

### 3. The status page is Instatus, not Statuspage — and its JSON API is a different shape

`status.airtop.ai` looks like the now-common Atlassian Statuspage pattern from a URL alone, but it
isn't one: the usual `/api/v2/summary.json` nested `{page, status, components}` shape does not exist
here. What's actually live (confirmed 2026-09-01):

| Path                 | Status | Body                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `/summary.json`       | 200    | `{"page":{"name":"Airtop","url":"...","status":"UP"}}`                |
| `/components.json`    | 200    | `{"components":[{"id":"...","name":"App","status":"OPERATIONAL"}]}`   |
| `/api/v2/summary.json`| 200    | The *same minimal* body as `/summary.json` — an alias, not the richer shape |
| `/status.json`, `/incidents.json`, `/api/v2/status.json`, `/api/v2/incidents.json` | 404 | Next.js 404 page — not real endpoints on this host |

Airtop's page stayed `"UP"` throughout verification, so only that page-level value and the
`"OPERATIONAL"` component value were observed on the wire. `"HASISSUES"` and `"UNDERMAINTENANCE"` are
mapped from Instatus's documented vocabulary elsewhere (not independently reproduced against Airtop's
own page in this session) — any value the mapper hasn't seen reports `unknown`, never a guessed
`down`, per this pack's health-check discipline.

## Other notes

- **Auth is `Authorization: Bearer <api-key>`** (`components.securitySchemes.BearerAuth`,
  `x-fern-bearer.name: "apiKey"`). The credential-liveness probe is `GET /v1/sessions?limit=1` — it
  requires a credential (confirmed live: `401 {"message":"missing required header authorization"}`
  with none, `401 {"message":"invalid api key"}` with a wrong one) and returns nothing secret. A
  session's `cdpUrl` / `cdpWsUrl` / `chromedriverUrl` are themselves bearer-protected connection
  endpoints, not the API key.
- **Sessions bill by session-minute regardless of activity.** `timeoutMinutes` on Create Session is an
  *idle* timeout (default 10, resets on every request), not a hard ceiling — a workflow that forgets
  to terminate a session pays for it until that idle timer fires.
- **`Delete Profiles`' query parameter is documented ambiguously.** The OpenAPI schema marks
  `profileNames` as an `explode: true` array (which normally means a *repeated* key), but the
  parameter's own description says "a comma-separated list of profile names." This app follows the
  prose (comma-joined) — see the comment on `csv()` in `lib/client.ts`.
- **`profileIds` is deprecated in favor of `profileNames`** on `DELETE /v1/profiles` — only the latter
  is exposed here.
- **No credit/quota headroom endpoint exists.** Every AI interaction's response reports the credits
  *it* consumed (`meta.usage.credits`), but nothing in the public surface reads back a balance or
  ceiling, and no operation documents a rate-limit response header (checked every `responses[].headers`
  entry in the spec — only `content-type` appears, everywhere). `health/quota.ts` is a declared
  absence with `severity: "informational"`, per `HEALTHCHECKS.md`.
- **Airtop is SaaS-only.** There is no self-hosted Airtop, so the `service` health check's `degraded`
  default severity is left as-is — every Connection this app can hold runs on the infrastructure that
  page describes.

## Auth

**API Key** (`bearer`) — paste a key from the Airtop portal, Settings > API Keys.

## Actions

**Sessions** — `session-create`, `session-list`, `session-get`, `session-terminate`,
`session-save-profile`.

**Profiles** — `profile-delete`.

**Windows** — `window-create`, `window-list`, `window-get`, `window-close`, `window-load-url`.

**Page interactions (AI-driven)** — `window-click`, `window-hover`, `window-type`, `window-scroll`,
`window-screenshot`, `window-scrape-content`, `window-page-query`, `window-paginated-extraction`,
`window-summarize-content`, `window-file-input`.

**Files** — `file-list`, `file-get`, `file-delete`.
