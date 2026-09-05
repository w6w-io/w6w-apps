/**
 * Hedy — AI meeting-notes and highlights: read meeting sessions (transcript,
 * recap, structured minutes) and the AI-extracted highlights inside them,
 * over Hedy's REST API (`api.hedy.bot`).
 *
 * Every path, parameter, response field and error shape here was verified on
 * 2026-09-05 against Hedy's own OpenAPI 3.0.0 document
 * (`https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1`) plus live probes
 * against `api.hedy.bot`. Nothing came from a third-party integration
 * directory.
 *
 * Three findings that shaped this app:
 *
 *  1. **The host is `api.hedy.bot`, not `api.hedy.ai`.** The marketing site
 *     rebranded `hedy.bot` -> `hedy.ai`, but the API host never moved;
 *     `api.hedy.ai` is NXDOMAIN. See `lib/client.ts`.
 *  2. **Unauthenticated calls answer 401 with a structured body, not 404.**
 *     A genuinely unknown route is the only thing that answers 404 (plain
 *     HTML, not this API's JSON at all). See `auth/api-key.ts`.
 *  3. **The Webhooks tag exists but publishes no paths.** Hedy's own
 *     document declares Sessions, Highlights and Webhooks tags, but every
 *     operation in it is under Sessions or Highlights — nothing is
 *     documented under Webhooks. Nothing here was guessed to fill that gap;
 *     this app covers reads only.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sessionsList from "./actions/sessions-list.ts";
import sessionGet from "./actions/session-get.ts";
import highlightsList from "./actions/highlights-list.ts";
import highlightGet from "./actions/highlight-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sessionsList,
    sessionGet,
    highlightsList,
    highlightGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
