/**
 * Wrike — the work-management platform: tasks, folders/projects, comments,
 * contacts (users & groups), timelogs and attachment metadata, over the
 * Wrike API v4.
 *
 * Every path, parameter and response shape in this app was verified on
 * 2026-08-29 against Wrike's own machine-readable OpenAPI 3.0.1 documents —
 * published one per endpoint at `developers.wrike.com/reference/<operationId>`,
 * there is no single combined spec — plus a live probe of
 * `www.wrike.com/api/v4/version`. Nothing here came from a third-party
 * integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Every mutating request is a query string, never a JSON body.**
 *     Wrike's own OpenAPI documents declare every POST/PUT field —
 *     scalars, arrays and objects alike — `"in": "query"`. A client that
 *     POSTs JSON instead gets a *successful*-looking response with none of
 *     the fields applied. See `lib/client.ts`.
 *  2. **The API host is chosen per account, not fixed.** Wrike stores
 *     customer data in one of three data centers (`www.wrike.com` /
 *     `app-eu.wrike.com` / `app-us2.wrike.com`); the wrong one for a given
 *     account answers `401 not_authorized`, identical to a bad token. See
 *     `auth/permanent-token.ts`.
 *  3. **The obvious whoami is safe, but the vendor publishes nothing to
 *     watch.** Unlike several apps in this pack, no Wrike read endpoint used
 *     here returns live credential material — but Wrike also publishes no
 *     usable status feed and no rate-limit headroom of any kind. See
 *     `health/service.ts` and `health/quota.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import permanentToken from "./auth/permanent-token.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderDelete from "./actions/folder-delete.ts";

import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import commentGet from "./actions/comment-get.ts";
import commentUpdate from "./actions/comment-update.ts";
import commentDelete from "./actions/comment-delete.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";

import timelogList from "./actions/timelog-list.ts";
import timelogCreate from "./actions/timelog-create.ts";
import timelogGet from "./actions/timelog-get.ts";
import timelogUpdate from "./actions/timelog-update.ts";
import timelogDelete from "./actions/timelog-delete.ts";

import attachmentList from "./actions/attachment-list.ts";
import attachmentGet from "./actions/attachment-get.ts";
import attachmentDownloadUrlGet from "./actions/attachment-download-url-get.ts";
import attachmentDelete from "./actions/attachment-delete.ts";

import accountGet from "./actions/account-get.ts";
import versionGet from "./actions/version-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import account from "./health/account.ts";

export default {
  actions: [
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    // Folders & projects
    folderList,
    folderGet,
    folderCreate,
    folderUpdate,
    folderDelete,
    // Comments
    commentList,
    commentCreate,
    commentGet,
    commentUpdate,
    commentDelete,
    // Contacts (users & groups)
    contactList,
    contactGet,
    contactUpdate,
    // Timelogs
    timelogList,
    timelogCreate,
    timelogGet,
    timelogUpdate,
    timelogDelete,
    // Attachments (metadata)
    attachmentList,
    attachmentGet,
    attachmentDownloadUrlGet,
    attachmentDelete,
    // Account
    accountGet,
    versionGet,
  ],
  // Permanent Access Token only — see auth/permanent-token.ts for why this is
  // preferred over OAuth2 for a workflow Connection.
  auth: [permanentToken],
  healthChecks: [service, quota, account],
} satisfies AppDefinition;
