/**
 * OpusClip — AI video clipping: turn a long-form video into short, viral,
 * vertical clips, over the OpusClip Clip API (`api.opus.pro`).
 *
 * Every path, verb, parameter, request/response field and enum in this app
 * was verified on 2026-09-05 against OpusClip's own machine-readable OpenAPI
 * 3.0 document (`help.opus.pro/api-reference/openapi.json`, 103,310 bytes,
 * `info.title` "Clip API", `info.version` "1.0"), cross-referenced against the
 * vendor's own narrative docs (Quickstart, Create a Project, Social Posting,
 * Limitations, Webhook), plus live probes against `api.opus.pro` and
 * `status.opus.pro`. Nothing here came from a third-party integration
 * directory, and the MCP-only surface (`agent-setup.md`'s `opusclip_edit_clip`
 * and friends) is deliberately NOT reproduced here — it has no REST
 * counterpart in the OpenAPI document this app was built from.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **A plain-text, non-JSON 401.** Live-probed `GET /api/social-accounts`
 *     with no/a fake bearer token: both answered `401` with
 *     `content-type: text/plain` and a body that is literally the 12-byte
 *     string `Unauthorized` — not the `{errorName, errorMessage}` shape the
 *     OpenAPI document uses for other 4xx responses. See `auth/api-key.ts`
 *     and `lib/client.ts`.
 *  2. **Two response envelopes, not one.** Roughly half the endpoints answer
 *     `{"data": ...}`; clip projects, exportable clips, brand templates,
 *     censor jobs and generative jobs answer the bare resource with no
 *     envelope at all. See `lib/client.ts`.
 *  3. **The monthly cap is a 403 with its own JSON shape, on purpose.**
 *     `{"code": "API_MONTHLY_CAP_REACHED", "reset_at", "upgrade_url"}` at
 *     `403`, deliberately not `429`, so retry-on-429 agent loops don't spin —
 *     and there is no endpoint to read remaining headroom in advance, only
 *     this refusal after the fact. See `health/quota.ts`.
 *  4. **A status-page component's own field lies about its incident.**
 *     `status.opus.pro`'s components API returned a component reading
 *     `status: "OPERATIONAL"` while it carried an open `MAJOROUTAGE` incident
 *     — confirmed live, not hypothetical. See `health/service.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import brandTemplateList from "./actions/brand-template-list.ts";

import clipProjectCreate from "./actions/clip-project-create.ts";
import clipProjectGet from "./actions/clip-project-get.ts";
import clipProjectUpdateVisibility from "./actions/clip-project-update-visibility.ts";
import clipList from "./actions/clip-list.ts";

import collectionCreate from "./actions/collection-create.ts";
import collectionList from "./actions/collection-list.ts";
import collectionDelete from "./actions/collection-delete.ts";
import collectionExport from "./actions/collection-export.ts";
import collectionContentAdd from "./actions/collection-content-add.ts";
import collectionContentRemove from "./actions/collection-content-remove.ts";

import censorJobCreate from "./actions/censor-job-create.ts";
import censorJobGet from "./actions/censor-job-get.ts";

import socialAccountList from "./actions/social-account-list.ts";
import socialCopyJobCreate from "./actions/social-copy-job-create.ts";
import socialCopyJobGet from "./actions/social-copy-job-get.ts";
import postTaskCreate from "./actions/post-task-create.ts";
import publishScheduleCreate from "./actions/publish-schedule-create.ts";
import publishScheduleCancel from "./actions/publish-schedule-cancel.ts";

import generativeJobCreate from "./actions/generative-job-create.ts";
import generativeJobGet from "./actions/generative-job-get.ts";

import transcriptGet from "./actions/transcript-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Brand templates
    brandTemplateList,
    // Clip projects
    clipProjectCreate,
    clipProjectGet,
    clipProjectUpdateVisibility,
    clipList,
    // Collections
    collectionCreate,
    collectionList,
    collectionDelete,
    collectionExport,
    collectionContentAdd,
    collectionContentRemove,
    // Censor jobs
    censorJobCreate,
    censorJobGet,
    // Social posting
    socialAccountList,
    socialCopyJobCreate,
    socialCopyJobGet,
    postTaskCreate,
    publishScheduleCreate,
    publishScheduleCancel,
    // Generative (thumbnail) jobs
    generativeJobCreate,
    generativeJobGet,
    // Transcripts
    transcriptGet,
  ],
  // API key only. OpusClip publishes no OAuth surface for third-party apps —
  // the dashboard-issued key (bearer token) is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
