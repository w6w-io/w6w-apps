/**
 * Missive — the shared team inbox: email, SMS, WhatsApp, Live Chat and social
 * messages unified into one collaborative workspace, over the Missive REST
 * API v1 (`public.missiveapp.com/v1`).
 *
 * Every path, verb, request body and response shape in this app was verified
 * on 2026-08-29 against Missive's own GitBook-hosted API reference
 * (`missiveapp.com/docs/developers/rest-api`, its `endpoints` and
 * `rate-limits` sub-pages) plus live probes against `public.missiveapp.com`
 * and `status.missiveapp.com`. Nothing here was inferred from a third-party
 * integration or a sibling app.
 *
 * Missive's public API is deliberately narrow next to the product it fronts —
 * there is no inbox-browsing surface beyond a handful of reads. What it does
 * cover: conversations (list/get/update/merge, plus reading their
 * messages/comments/drafts/posts), drafts (create — including immediate or
 * scheduled send — and delete; this is the documented way to send a message),
 * messages (create for custom channels only, get, find by Message-ID), posts
 * (Missive's recommended trace-leaving way to manage conversation state from
 * an integration), canned responses (full CRUD), contacts/contact
 * books/contact groups, shared labels, teams and users, tasks (full CRUD),
 * webhook subscriptions, organizations, and analytics reports.
 *
 * Three findings shaped the design, each documented in full where it matters:
 *
 *  1. **Tokens are personal, not scoped, not org-bound.** Missive's own words:
 *     "Your personal token has access to any account you can access in
 *     Missive, including shared accounts." There is no "narrowest usable
 *     credential" to design an auth probe around — see `auth/api-token.ts`.
 *  2. **A "get one" response is an array for conversations, an object for
 *     everything else.** `GET /v1/conversations/:id` documents
 *     `{"conversations": [{...}]}` because a merge can resolve to a different
 *     id; `GET /v1/messages/:id` and `GET /v1/tasks/:id` document a bare
 *     object. `lib/client.ts`'s `unwrapSingle` handles either rather than
 *     guessing one shape pack-wide.
 *  3. **Both health surfaces are genuinely absent, not just hard to find.**
 *     Missive's real status page runs on PagerDuty's status-page product
 *     behind an authenticated realtime channel (no static feed reachable
 *     anonymously — see `health/service.ts`), and its rate-limit headers are
 *     documented as accompanying only the 429 refusal itself, never an
 *     ordinary response (see `health/quota.ts`). Both are declared
 *     `unavailable` at `informational` severity rather than guessed at.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import analyticsReportCreate from "./actions/analytics-report-create.ts";
import analyticsReportGet from "./actions/analytics-report-get.ts";

import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactBookList from "./actions/contact-book-list.ts";
import contactGroupList from "./actions/contact-group-list.ts";

import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationMessagesList from "./actions/conversation-messages-list.ts";
import conversationCommentsList from "./actions/conversation-comments-list.ts";
import conversationDraftsList from "./actions/conversation-drafts-list.ts";
import conversationPostsList from "./actions/conversation-posts-list.ts";
import conversationMerge from "./actions/conversation-merge.ts";

import draftCreate from "./actions/draft-create.ts";
import draftDelete from "./actions/draft-delete.ts";

import messageCreate from "./actions/message-create.ts";
import messageGet from "./actions/message-get.ts";
import messageList from "./actions/message-list.ts";

import organizationList from "./actions/organization-list.ts";

import responseList from "./actions/response-list.ts";
import responseGet from "./actions/response-get.ts";
import responseCreate from "./actions/response-create.ts";
import responseUpdate from "./actions/response-update.ts";
import responseDelete from "./actions/response-delete.ts";

import postCreate from "./actions/post-create.ts";
import postDelete from "./actions/post-delete.ts";

import sharedLabelCreate from "./actions/shared-label-create.ts";
import sharedLabelUpdate from "./actions/shared-label-update.ts";
import sharedLabelList from "./actions/shared-label-list.ts";

import teamList from "./actions/team-list.ts";
import teamCreate from "./actions/team-create.ts";
import teamUpdate from "./actions/team-update.ts";

import userList from "./actions/user-list.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Analytics
    analyticsReportCreate,
    analyticsReportGet,
    // Contacts
    contactCreate,
    contactUpdate,
    contactList,
    contactGet,
    contactBookList,
    contactGroupList,
    // Conversations
    conversationList,
    conversationGet,
    conversationUpdate,
    conversationMessagesList,
    conversationCommentsList,
    conversationDraftsList,
    conversationPostsList,
    conversationMerge,
    // Drafts
    draftCreate,
    draftDelete,
    // Messages
    messageCreate,
    messageGet,
    messageList,
    // Organizations
    organizationList,
    // Responses (canned responses)
    responseList,
    responseGet,
    responseCreate,
    responseUpdate,
    responseDelete,
    // Posts
    postCreate,
    postDelete,
    // Shared labels
    sharedLabelCreate,
    sharedLabelUpdate,
    sharedLabelList,
    // Teams
    teamList,
    teamCreate,
    teamUpdate,
    // Users
    userList,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    // Webhooks
    webhookCreate,
    webhookDelete,
  ],
  // API token only. Missive publishes no OAuth surface for third-party apps.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
