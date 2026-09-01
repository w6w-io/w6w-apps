/**
 * Lokalise — translation and localization management, over the Lokalise
 * REST API v2 (`api.lokalise.com/api2`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-01 against Lokalise's own OpenAPI 3.0.3 document
 * (`developers.lokalise.com/openapi/lokalise-api-without-branches.yml` —
 * served as JSON despite the `.yml` extension, 270,538 bytes) plus live
 * probes against `api.lokalise.com` and `status.lokalise.com`. Nothing here
 * came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Every "create" endpoint is bulk-only** (`lib/client.ts`,
 *     `actions/key-create.ts`, `language-create.ts`, `contributor-create.ts`,
 *     `comment-create.ts`). Even one item is sent as an array of one, and a
 *     `200` response can carry a per-item `errors` array alongside the
 *     successes — one HTTP status, partial success.
 *  2. **A `200` on a delete does not always mean the resource is gone**
 *     (`actions/key-delete.ts`, `project-delete.ts`). Lokalise's own
 *     documented example for deleting a key is `{"key_removed": false,
 *     "keys_locked": 1}` — a locked key survives a "successful" delete call.
 *  3. **The auth error status is not always what the docs say**
 *     (`auth/api-token.ts`). The error-codes page documents `401` as "no
 *     valid API key" — live probes on 2026-09-01 show a missing/malformed
 *     `X-Api-Token` header answers `400`, and only a well-formed-but-wrong
 *     token gets `401`.
 *  4. **Project type changes which actions even apply.** Per-key deletion
 *     (`key-delete`) works on Software and Marketing projects but not
 *     Documents ones; per-file deletion (`file-delete`) is the exact
 *     opposite. Neither action attempts to detect the project type in
 *     advance — Lokalise's own `400 "Action not supported by this type of
 *     project"` is surfaced verbatim instead.
 *  5. **Rate-limit headroom is genuinely readable here** (`health/
 *     request-rate.ts`), unlike several vendors in this pack: every response
 *     carries a real `x-ratelimit-remaining`, not just a ceiling.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";

import keyList from "./actions/key-list.ts";
import keyGet from "./actions/key-get.ts";
import keyCreate from "./actions/key-create.ts";
import keyUpdate from "./actions/key-update.ts";
import keyDelete from "./actions/key-delete.ts";

import languageListSystem from "./actions/language-list-system.ts";
import languageList from "./actions/language-list.ts";
import languageCreate from "./actions/language-create.ts";

import translationList from "./actions/translation-list.ts";
import translationGet from "./actions/translation-get.ts";
import translationUpdate from "./actions/translation-update.ts";

import fileList from "./actions/file-list.ts";
import fileUpload from "./actions/file-upload.ts";
import fileDownload from "./actions/file-download.ts";
import fileDelete from "./actions/file-delete.ts";
import processGet from "./actions/process-get.ts";

import contributorList from "./actions/contributor-list.ts";
import contributorCreate from "./actions/contributor-create.ts";

import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import teamList from "./actions/team-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Projects
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    // Keys
    keyList,
    keyGet,
    keyCreate,
    keyUpdate,
    keyDelete,
    // Languages
    languageListSystem,
    languageList,
    languageCreate,
    // Translations
    translationList,
    translationGet,
    translationUpdate,
    // Files
    fileList,
    fileUpload,
    fileDownload,
    fileDelete,
    processGet,
    // Contributors
    contributorList,
    contributorCreate,
    // Comments
    commentList,
    commentCreate,
    // Tasks
    taskList,
    taskCreate,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
    // Teams
    teamList,
  ],
  // API token only. Lokalise's OAuth2 flow requires a manual, per-integration
  // registration via their support chat — there is no self-service app
  // registry — so it is not implemented here. See README.
  auth: [apiToken],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
