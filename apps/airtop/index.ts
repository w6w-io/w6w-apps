/**
 * Airtop — cloud browser sessions driven by AI, over the Airtop API
 * (`api.airtop.ai`).
 *
 * Every path, verb, request/response field and status code in this app was
 * verified on 2026-09-01 against Airtop's own OpenAPI 3.1.0 document
 * (`https://api.airtop.ai/api/openapi.json`, 529,210 bytes, `info.title`
 * "Browser Control API") plus live probes against `api.airtop.ai` and
 * `status.airtop.ai`. See `lib/client.ts` for the response-envelope shape and
 * `README.md` for the full account of what was verified and what was left out.
 *
 * ## What this app covers, and what it deliberately does not
 *
 * The OpenAPI document tags every operation with `x-fern-audiences`: only
 * `public`-tagged operations are implemented here — Sessions, Windows,
 * Profiles (one endpoint: Delete), and Files.
 *
 * Left out, and why:
 *
 *  1. **The `v2` `act`/`extract`/`find-one`/`find-many`/`navigate`/
 *     `wait-for-page`/`llm` interface** (`/v2/sessions/{id}/windows/{id}/...`).
 *     Tagged `beta`, and every one of their request schemas — confirmed by
 *     reading `required` on `ActRequest`, `ExtractRequest`, `Find-oneRequest`,
 *     `Find-manyRequest`, `Wait-for-pageRequest` and `LlmRequest` — requires a
 *     `jobId` ("the id of the job to which this operation belongs") with no
 *     documented endpoint to create one from outside Airtop's own `Agents`
 *     product (`/v2/agents`, tagged `alpha`). There is no confirmed way for
 *     this app to obtain a valid `jobId`, so rather than guess one it leaves
 *     the whole group out. (Also notable: even called synchronously, these
 *     endpoints answer only `{requestId}` — the actual result is fetched
 *     separately via `GET /v2/requests/{requestId}/status`, which this app
 *     also does not implement, since it would only ever be polling a request
 *     this app cannot create.)
 *  2. **`Agents` / `GTM Engineer` / `Knowledge Base` / `Team Vault` /
 *     `Sensitive Values` / `Agent Folders`** (`/v2/agents/...`,
 *     `/v1/gtm-engineer/...`, `/v2/organizations/.../knowledge-base`, …).
 *     Every operation under these is tagged `alpha` — Airtop's own internal
 *     product surface, not a third-party integration target.
 *  3. **Two-phase file upload.** `POST /v1/files` returns an `uploadUrl` the
 *     caller must `PUT` the file's bytes to directly — a per-file host this
 *     app cannot pre-declare in `network.allow`. `file-list`/`file-get`/
 *     `file-delete` cover the read/delete side of the Files API; creating and
 *     completing an upload is left out.
 *  4. **Form-filling and complex composite actions** (`fill-form`,
 *     `create-form-filler`, `analyze-form-state`, `browser-use`,
 *     `computer-use`, `web-archive`, `identify`, `monitor`). These are real
 *     and `public`-tagged, but branch across strategies this app does not
 *     otherwise implement (`automation`, Claude Code, Codex) or return data
 *     this app has no other action to produce — left out rather than modeled
 *     speculatively.
 *
 * ## Two findings that shaped the code
 *
 *  1. **`GET /v1/sessions` (used for the auth probe) leaks nothing, but the
 *     obvious `data.modelResponse` shape is NOT universal.** Every AI window
 *     interaction except `scrape-content` answers a text string there;
 *     `scrape-content` answers a structured object
 *     (`{scrapedContent, title, selectedText}`) instead, and `screenshot`
 *     answers an essentially empty string — the actual image lives at
 *     `meta.screenshots[0]`, not `data`. See `lib/client.ts` and
 *     `actions/window-scrape-content.ts` / `actions/window-screenshot.ts`.
 *  2. **`outputSchema` is a string, not an object.** Every AI interaction that
 *     accepts one (`page-query`, `paginated-extraction`, `summarize-content`)
 *     documents it as `type: "string"` — a serialized JSON Schema document —
 *     not a JSON object, confirmed from the schema itself.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sessionCreate from "./actions/session-create.ts";
import sessionList from "./actions/session-list.ts";
import sessionGet from "./actions/session-get.ts";
import sessionTerminate from "./actions/session-terminate.ts";
import sessionSaveProfile from "./actions/session-save-profile.ts";

import profileDelete from "./actions/profile-delete.ts";

import windowCreate from "./actions/window-create.ts";
import windowList from "./actions/window-list.ts";
import windowGet from "./actions/window-get.ts";
import windowClose from "./actions/window-close.ts";
import windowLoadUrl from "./actions/window-load-url.ts";

import windowClick from "./actions/window-click.ts";
import windowHover from "./actions/window-hover.ts";
import windowType from "./actions/window-type.ts";
import windowScroll from "./actions/window-scroll.ts";
import windowScreenshot from "./actions/window-screenshot.ts";
import windowScrapeContent from "./actions/window-scrape-content.ts";
import windowPageQuery from "./actions/window-page-query.ts";
import windowPaginatedExtraction from "./actions/window-paginated-extraction.ts";
import windowSummarizeContent from "./actions/window-summarize-content.ts";
import windowFileInput from "./actions/window-file-input.ts";

import fileList from "./actions/file-list.ts";
import fileGet from "./actions/file-get.ts";
import fileDelete from "./actions/file-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sessions
    sessionCreate,
    sessionList,
    sessionGet,
    sessionTerminate,
    sessionSaveProfile,
    // Profiles
    profileDelete,
    // Windows
    windowCreate,
    windowList,
    windowGet,
    windowClose,
    windowLoadUrl,
    // Page interactions (AI-driven)
    windowClick,
    windowHover,
    windowType,
    windowScroll,
    windowScreenshot,
    windowScrapeContent,
    windowPageQuery,
    windowPaginatedExtraction,
    windowSummarizeContent,
    windowFileInput,
    // Files
    fileList,
    fileGet,
    fileDelete,
  ],
  // API key only. Airtop publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
