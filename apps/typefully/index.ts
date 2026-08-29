/**
 * Typefully — social media writing, scheduling, and publishing across X,
 * LinkedIn, Mastodon, Threads, Bluesky, and Substack Notes, over the
 * Typefully Public API v2 (`api.typefully.com`).
 *
 * Every path, method, parameter, request/response field and error code here
 * was verified on 2026-08-29 against Typefully's own OpenAPI 3.1 document
 * (`info.title` "Typefully Public API", `info.version` "2.0.0"), extracted
 * from the React payload embedded in `https://typefully.com/docs/api` itself
 * — not a third-party integration directory, and not the (much smaller) API
 * surface a first pass at typefully.com/docs/api's rendered prose alone would
 * suggest. This app implements every operation the vendor documents: 25
 * across Users, Social Sets, Drafts, Media, Tags, Queue, LinkedIn mention
 * resolution, Comment Threads, and Analytics.
 *
 * Three findings shaped the design:
 *
 *  1. **`platforms` is one JSON object, not a flat param tree**
 *     (`actions/draft-create.ts`, `actions/draft-update.ts`). The vendor's own
 *     `Platforms` schema is a discriminated union across seven very different
 *     per-platform shapes; passing it through as documented is more faithful
 *     than a parallel re-specification of it would be.
 *  2. **Media upload is two calls, and this app can only make one of them**
 *     (`actions/media-upload-create.ts`). The second — PUTting raw bytes to a
 *     presigned S3 URL — targets a host generated per-call, which a static
 *     `network.allow` cannot declare in advance. Same reasoning this pack's
 *     `linkedin` app already applies to LinkedIn's own image upload.
 *  3. **No vendor status feed exists** (`health/service.ts`). Every candidate
 *     host was checked live and ruled out — a bad TLS cert, an unclaimed
 *     Statuspage decoy, a generic Better Stack redirect, and no `status.*`
 *     reference anywhere on the marketing site or in the API spec itself.
 *
 * ## X automation compliance
 *
 * Typefully's own docs open with a compliance notice worth repeating here
 * rather than dropping silently: scheduling to X through this API must follow
 * [X's automation rules](https://help.x.com/en/rules-and-policies/x-automation)
 * and [X rules](https://help.x.com/en/rules-and-policies/x-rules), and
 * Typefully's API "is meant to create personal automations and workflows" —
 * an app built on it for other people's X accounts at scale needs
 * [X's own API](https://developer.x.com/en) instead.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";

import socialSetList from "./actions/social-set-list.ts";
import socialSetGet from "./actions/social-set-get.ts";

import draftList from "./actions/draft-list.ts";
import draftCreate from "./actions/draft-create.ts";
import draftGet from "./actions/draft-get.ts";
import draftUpdate from "./actions/draft-update.ts";
import draftDelete from "./actions/draft-delete.ts";

import mediaUploadCreate from "./actions/media-upload-create.ts";
import mediaStatusGet from "./actions/media-status-get.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";

import queueScheduleGet from "./actions/queue-schedule-get.ts";
import queueScheduleReplace from "./actions/queue-schedule-replace.ts";
import queueGet from "./actions/queue-get.ts";

import linkedinOrganizationResolve from "./actions/linkedin-organization-resolve.ts";

import commentThreadList from "./actions/comment-thread-list.ts";
import commentThreadCreate from "./actions/comment-thread-create.ts";
import commentCreate from "./actions/comment-create.ts";
import commentThreadResolve from "./actions/comment-thread-resolve.ts";
import commentUpdate from "./actions/comment-update.ts";
import commentDelete from "./actions/comment-delete.ts";
import commentThreadDelete from "./actions/comment-thread-delete.ts";

import analyticsPostsList from "./actions/analytics-posts-list.ts";
import analyticsFollowersGet from "./actions/analytics-followers-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users
    userGet,
    // Social sets
    socialSetList,
    socialSetGet,
    // Drafts
    draftList,
    draftCreate,
    draftGet,
    draftUpdate,
    draftDelete,
    // Media
    mediaUploadCreate,
    mediaStatusGet,
    // Tags
    tagList,
    tagCreate,
    // Queue
    queueScheduleGet,
    queueScheduleReplace,
    queueGet,
    // LinkedIn
    linkedinOrganizationResolve,
    // Comment threads
    commentThreadList,
    commentThreadCreate,
    commentCreate,
    commentThreadResolve,
    commentUpdate,
    commentDelete,
    commentThreadDelete,
    // Analytics
    analyticsPostsList,
    analyticsFollowersGet,
  ],
  // API key only. Typefully publishes no OAuth surface for third-party apps —
  // a bearer key generated from Settings is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
