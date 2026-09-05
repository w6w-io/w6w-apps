/**
 * Sender (sender.net) — email (and SMS) marketing platform. Manage
 * subscribers, groups, segments, custom fields, custom events, campaigns and
 * account webhooks over the Sender API v2 (`api.sender.net/v2`).
 *
 * Every path, verb and body field in this app was verified on 2026-09-05
 * against `api.sender.net`'s own documentation pages — a real Astro/Starlight
 * site confirmed via its sitemap (`api.sender.net/sitemap-0.xml`, 74 distinct
 * endpoint pages) and byte-diffed against a bogus path to rule out a
 * catch-all SPA shell. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **`api.sender.net` answers an unknown path with HTTP 200**, not a 404 —
 *     it serves its own homepage as a soft fallback. Every endpoint here was
 *     verified against the sitemap's actual documentation page and its
 *     worked example, never against path liveness (`lib/client.ts`).
 *  2. **Not every success response carries a `data` envelope.** Delete
 *     subscriber, get subscriber events, and get campaign errors all answer
 *     without one — `SenderClient.data()` unwraps `data` only when present
 *     rather than assuming a shape (`lib/client.ts`).
 *  3. **Sender publishes no confirmed status page or quota-headroom signal.**
 *     `status.sender.net` doesn't resolve, `sender.statuspage.io` is an
 *     unclaimed redirect, and `sender.freshstatus.io` is a 200-with-404-payload
 *     decoy — the same "200 is not proof" trap the API host itself exhibits,
 *     just on a different domain (`health/service.ts`). The documented
 *     `X-RateLimit-*` headers are shown only in the 429 section, with no
 *     stated behaviour on ordinary responses, so quota headroom is also left
 *     undeclared rather than guessed (`health/quota.ts`).
 *
 * Deliberately NOT implemented in this pass, though documented by the vendor:
 * transactional campaigns, workflow management, and the `statistics/*`
 * endpoints (campaign clicks/opens/bounces/unsubscribes reporting). See
 * README.md for why.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import subscriberCreate from "./actions/subscriber-create.ts";
import subscriberGet from "./actions/subscriber-get.ts";
import subscriberList from "./actions/subscriber-list.ts";
import subscriberUpdate from "./actions/subscriber-update.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberAddGroup from "./actions/subscriber-add-group.ts";
import subscriberRemoveGroup from "./actions/subscriber-remove-group.ts";
import subscriberRemovePhone from "./actions/subscriber-remove-phone.ts";
import subscriberEventsGet from "./actions/subscriber-events-get.ts";

import groupCreate from "./actions/group-create.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";
import groupSubscribersList from "./actions/group-subscribers-list.ts";

import segmentList from "./actions/segment-list.ts";
import segmentGet from "./actions/segment-get.ts";
import segmentDelete from "./actions/segment-delete.ts";
import segmentSubscribersList from "./actions/segment-subscribers-list.ts";

import fieldCreate from "./actions/field-create.ts";
import fieldList from "./actions/field-list.ts";
import fieldUpdate from "./actions/field-update.ts";
import fieldDelete from "./actions/field-delete.ts";

import eventCreate from "./actions/event-create.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignDelete from "./actions/campaign-delete.ts";
import campaignSend from "./actions/campaign-send.ts";
import campaignSchedule from "./actions/campaign-schedule.ts";
import campaignCancelSchedule from "./actions/campaign-cancel-schedule.ts";
import campaignCancelFollowup from "./actions/campaign-cancel-followup.ts";
import campaignCopy from "./actions/campaign-copy.ts";
import campaignErrorsGet from "./actions/campaign-errors-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Subscribers
    subscriberCreate,
    subscriberGet,
    subscriberList,
    subscriberUpdate,
    subscriberDelete,
    subscriberAddGroup,
    subscriberRemoveGroup,
    subscriberRemovePhone,
    subscriberEventsGet,
    // Groups
    groupCreate,
    groupList,
    groupGet,
    groupUpdate,
    groupDelete,
    groupSubscribersList,
    // Segments (read-only — no create-segment endpoint exists)
    segmentList,
    segmentGet,
    segmentDelete,
    segmentSubscribersList,
    // Custom fields
    fieldCreate,
    fieldList,
    fieldUpdate,
    fieldDelete,
    // Custom events
    eventCreate,
    // Campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignDelete,
    campaignSend,
    campaignSchedule,
    campaignCancelSchedule,
    campaignCancelFollowup,
    campaignCopy,
    campaignErrorsGet,
    // Account webhooks (paid plans only)
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  // Bearer API token only. Sender publishes no OAuth surface; per its own
  // docs the token "carries full access to your account" — no scoping.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
