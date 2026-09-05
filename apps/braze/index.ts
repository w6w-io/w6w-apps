/**
 * Braze — the customer engagement / marketing automation platform: track user
 * data, trigger campaigns and Canvases, send ad-hoc messages, manage email
 * subscription state, and read back campaigns, Canvases, segments, Content
 * Blocks, and catalogs, over Braze's REST API.
 *
 * Every path, method, request body field, and error envelope in this app was
 * verified against the community-maintained OpenAPI document Braze's own
 * ecosystem points partners at (`braze-community/braze-specification`,
 * `openapi/spec.json`, 575,410 bytes, `info.title` "Braze Endpoints", fetched
 * 2026-09-05), plus a live probe of `status.braze.com`. Nothing here came from
 * a third-party integration directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **There is no single Braze API host.** Every customer's workspace lives
 *     on one of several fixed clusters, and a REST key issued on one is
 *     rejected by every other. The spec's own `servers[]` array names nine of
 *     them — seven in the US on `braze.com` and, notably, **two in the EU on
 *     a different apex domain, `braze.eu`, not `braze.com`**. See
 *     `lib/client.ts` for the full host table and why the instance is a
 *     Connection field rather than something this app could guess or
 *     discover — Braze publishes no "which instance is this key for"
 *     endpoint. Braze's status page (`status.braze.com`) actually lists
 *     several MORE clusters (AU-01, ID-01, JP-01, KR-01, plus US-07/US-10)
 *     than the fetched spec gives REST hostnames for; those are out of scope
 *     here until the spec itself names a host for them, rather than guessed
 *     from a naming pattern.
 *  2. **No operation in the fetched spec is flagged `deprecated`** (checked
 *     structurally — zero `"deprecated": true` occurrences across all 82
 *     paths) — so nothing was excluded on that basis. Endpoints outside this
 *     app's ~22 actions were left out for scope, not deprecation: templates,
 *     SCIM dashboard-user management, preference centers, and every
 *     analytics `data_series`/`data_summary`/KPI export were not implemented
 *     in this pass. See the README for the full list and why.
 *  3. **Braze's own error envelope is uniform and structural, not
 *     status-code-only.** Every documented 400/401/403/404/429/500 response
 *     shares one schema, `{ message?: string, errors?: string[] }`
 *     (`components.schemas.Error` in the spec) — `lib/client.ts` reads it on
 *     every failure rather than trusting the HTTP status alone, and the Auth
 *     `test` hook uses it to tell a bad key (401) apart from a key that is
 *     valid but under-scoped for the probe endpoint (403).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userTrack from "./actions/user-track.ts";
import userIdentify from "./actions/user-identify.ts";
import userAliasNew from "./actions/user-alias-new.ts";
import userDelete from "./actions/user-delete.ts";
import userExportIds from "./actions/user-export-ids.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignDetailsGet from "./actions/campaign-details-get.ts";
import campaignTriggerSend from "./actions/campaign-trigger-send.ts";

import canvasList from "./actions/canvas-list.ts";
import canvasDetailsGet from "./actions/canvas-details-get.ts";
import canvasTriggerSend from "./actions/canvas-trigger-send.ts";

import messageSend from "./actions/message-send.ts";

import emailStatusSet from "./actions/email-status-set.ts";
import emailHardBouncesList from "./actions/email-hard-bounces-list.ts";
import emailUnsubscribesList from "./actions/email-unsubscribes-list.ts";

import contentBlockList from "./actions/content-block-list.ts";
import contentBlockGet from "./actions/content-block-get.ts";
import contentBlockCreate from "./actions/content-block-create.ts";

import catalogList from "./actions/catalog-list.ts";
import catalogItemList from "./actions/catalog-item-list.ts";

import segmentList from "./actions/segment-list.ts";

import smsInvalidPhoneNumberList from "./actions/sms-invalid-phone-number-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users
    userTrack,
    userIdentify,
    userAliasNew,
    userDelete,
    userExportIds,
    // Campaigns
    campaignList,
    campaignDetailsGet,
    campaignTriggerSend,
    // Canvas
    canvasList,
    canvasDetailsGet,
    canvasTriggerSend,
    // Messages
    messageSend,
    // Email
    emailStatusSet,
    emailHardBouncesList,
    emailUnsubscribesList,
    // Content Blocks
    contentBlockList,
    contentBlockGet,
    contentBlockCreate,
    // Catalogs
    catalogList,
    catalogItemList,
    // Segments
    segmentList,
    // SMS
    smsInvalidPhoneNumberList,
  ],
  // REST API key only. Braze's fetched spec declares exactly one security
  // scheme (BearerAuth) for every operation.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
