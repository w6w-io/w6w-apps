/**
 * Gamma (gamma.app) — the AI presentation/document/webpage/social generator,
 * over its Public API (`public-api.gamma.app`, prefix `/v1.0`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * on 2026-09-05 against the OpenAPI 3.0 fragments embedded in Gamma's own
 * Mintlify-hosted developer docs (`developers.gamma.app`) — see
 * `lib/client.ts` and `README.md` for how those were fetched. Nothing here
 * came from a third-party integration directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **Mintlify's `.md`-suffix trick.** Appending `.md` to any
 *     `developers.gamma.app` page returns the raw source — including an
 *     embedded OpenAPI fragment per endpoint page — instead of rendered HTML.
 *     `llms.txt` enumerates every real page, so the whole surface was read
 *     machine-readably rather than screen-scraped.
 *  2. **The icon host is not the API host, and not the apex domain either.**
 *     `gamma.app` itself bot-blocks a direct fetch (403); the icon comes from
 *     `developers.gamma.app`'s own `<link rel="apple-touch-icon">`, which
 *     points at a GitBook-hosted asset URL.
 *  3. **Gamma really does publish a status page** — `status.gamma.app`
 *     (Instatus), whose incident history names this app's own "API"
 *     component. See `health/service.ts` for why it's read as a feed and how
 *     an Instatus entry's terminal state is determined.
 *
 * ## Surface not implemented
 *
 * `authenticate-with-oauth.md` documents an OAuth 2.0 authorization-code flow
 * as an alternative to an API key, for an app acting on behalf of its own
 * users' Gamma accounts. This app implements only the `X-API-KEY` method: it
 * covers every documented endpoint, needs no redirect URI, and is what the
 * vendor's own quick-start recommends for direct/Zapier/Make/n8n-style
 * integration (`get-started/access-and-pricing.md`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import createGeneration from "./actions/create-generation.ts";
import getGenerationStatus from "./actions/get-generation-status.ts";
import createGenerationFromTemplate from "./actions/create-generation-from-template.ts";

import createImageGeneration from "./actions/create-image-generation.ts";
import getImageGenerationStatus from "./actions/get-image-generation-status.ts";
import archiveImage from "./actions/archive-image.ts";

import listThemes from "./actions/list-themes.ts";
import listFolders from "./actions/list-folders.ts";

import searchGammas from "./actions/search-gammas.ts";
import searchTemplates from "./actions/search-templates.ts";
import getGamma from "./actions/get-gamma.ts";
import listGammaComments from "./actions/list-gamma-comments.ts";
import archiveGamma from "./actions/archive-gamma.ts";
import exportGamma from "./actions/export-gamma.ts";
import getExportStatus from "./actions/get-export-status.ts";
import deleteGamma from "./actions/delete-gamma.ts";

import getGammaAnalytics from "./actions/get-gamma-analytics.ts";
import getGammaCardAnalytics from "./actions/get-gamma-card-analytics.ts";
import getGammaViewerAnalytics from "./actions/get-gamma-viewer-analytics.ts";
import getGammaViewerDetailAnalytics from "./actions/get-gamma-viewer-detail-analytics.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Generations
    createGeneration,
    getGenerationStatus,
    createGenerationFromTemplate,
    // Images
    createImageGeneration,
    getImageGenerationStatus,
    archiveImage,
    // Workspace
    listThemes,
    listFolders,
    // Management
    searchGammas,
    searchTemplates,
    getGamma,
    listGammaComments,
    archiveGamma,
    exportGamma,
    getExportStatus,
    deleteGamma,
    // Analytics
    getGammaAnalytics,
    getGammaCardAnalytics,
    getGammaViewerAnalytics,
    getGammaViewerDetailAnalytics,
  ],
  // API key only — see the module comment for why OAuth is left out.
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
