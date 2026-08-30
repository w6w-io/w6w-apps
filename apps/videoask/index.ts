/**
 * VideoAsk (by Typeform) — asynchronous video/audio/text conversations, over
 * the REST API at `api.videoask.com`.
 *
 * Every path, verb, query parameter, body field and response shape in this
 * app was verified on 2026-08-30 against the vendor's own Postman
 * collection — fetched as raw JSON from
 * `documenter.gw.postman.com/api/collections/291373/SWTEdwrG`, the data
 * source the public documentation page at
 * https://documenter.getpostman.com/view/291373/SWTEdwrG itself embeds and
 * fetches from client-side — plus live, unauthenticated probes against
 * `api.videoask.com` on the same day. Nothing here came from a third-party
 * integration directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **Auth is Auth0-backed OAuth2 and needs `audience`** (`auth/oauth2.ts`).
 *     `auth.videoask.com` is a separate host from the API and is an Auth0
 *     tenant; the authorize URL must carry
 *     `audience=https://api.videoask.com/` or Auth0 mints an ID token instead
 *     of an API access token. `offline_access` is requested by default so a
 *     Connection survives past its first access-token expiry via the
 *     standard `grant_type=refresh_token` flow — no custom hooks needed for
 *     either exchange or refresh.
 *  2. **Two response shapes, plus one exception** (`lib/client.ts`). Most
 *     endpoints return the entity itself with no envelope; list endpoints
 *     wrap it as `{results, next, previous, count?}` — except
 *     `GET /questions/{id}/answers`, which takes the same `limit`/`offset`
 *     params as every other list but answers a bare JSON array.
 *  3. **Direct video/audio upload is out of scope.** VideoAsk's "Create a
 *     question uploading media" flow is a two-step, S3-presigned-POST upload
 *     (get `presigned_post_params` from the API, then a raw multipart `POST`
 *     to `videoask-uploads-prod.s3(-accelerate).amazonaws.com`) that this
 *     app does not implement — see `actions/question-create.ts`. Only the
 *     external-media-URL creation path is covered.
 *
 * One more worth knowing before writing a workflow against this app:
 * `GET /forms/{id}/contacts/{id}` (Get Contact) carries a vendor-documented
 * rate limit of **50 requests per 5 minutes** — the only per-endpoint limit
 * anywhere in the collection, and easy to hit by polling contacts in a loop.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import organizationList from "./actions/organization-list.ts";
import accountGet from "./actions/account-get.ts";

import formList from "./actions/form-list.ts";
import formSearch from "./actions/form-search.ts";
import formGet from "./actions/form-get.ts";
import formMetricsGet from "./actions/form-metrics-get.ts";
import formCreate from "./actions/form-create.ts";
import formUpdate from "./actions/form-update.ts";
import formDuplicate from "./actions/form-duplicate.ts";
import formRestore from "./actions/form-restore.ts";
import formDelete from "./actions/form-delete.ts";

import conversationList from "./actions/conversation-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactDelete from "./actions/contact-delete.ts";
import conversationMarkRead from "./actions/conversation-mark-read.ts";

import questionGet from "./actions/question-get.ts";
import questionCreate from "./actions/question-create.ts";
import questionUpdate from "./actions/question-update.ts";
import questionDelete from "./actions/question-delete.ts";
import questionDuplicate from "./actions/question-duplicate.ts";
import questionAnswersList from "./actions/question-answers-list.ts";
import questionInsightsGet from "./actions/question-insights-get.ts";

import respondentCreate from "./actions/respondent-create.ts";
import respondentUpdate from "./actions/respondent-update.ts";
import respondentDelete from "./actions/respondent-delete.ts";

import mediaGet from "./actions/media-get.ts";
import mediaUpdate from "./actions/media-update.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";
import contactTagSet from "./actions/contact-tag-set.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookUpsert from "./actions/webhook-upsert.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import brandingList from "./actions/branding-list.ts";
import brandingGet from "./actions/branding-get.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Account / organizations
    accountGet,
    organizationList,
    // Forms
    formList,
    formSearch,
    formGet,
    formMetricsGet,
    formCreate,
    formUpdate,
    formDuplicate,
    formRestore,
    formDelete,
    // Conversations / contacts
    conversationList,
    contactGet,
    contactDelete,
    conversationMarkRead,
    // Questions
    questionGet,
    questionCreate,
    questionUpdate,
    questionDelete,
    questionDuplicate,
    questionAnswersList,
    questionInsightsGet,
    // Respondents
    respondentCreate,
    respondentUpdate,
    respondentDelete,
    // Media
    mediaGet,
    mediaUpdate,
    // Tags
    tagList,
    tagCreate,
    tagUpdate,
    tagDelete,
    contactTagSet,
    // Webhooks
    webhookList,
    webhookGet,
    webhookUpsert,
    webhookDelete,
    // Branding
    brandingList,
    brandingGet,
  ],
  // OAuth2 only. VideoAsk publishes no API-key auth for third-party apps.
  auth: [oauth2],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
