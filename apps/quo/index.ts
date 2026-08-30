/**
 * Quo — a business phone system: shared numbers, calling, texting, voicemail, contacts and
 * tasks for a whole workspace. Formerly branded **OpenPhone**; the product and API are
 * unchanged, only the name is different (see below).
 *
 * Every path, verb, query parameter, body field and response shape in this app was verified on
 * 2026-08-30 against Quo's own machine-readable OpenAPI document
 * (`openphone-public-api-prod.s3.us-west-2.amazonaws.com/public/openphone-public-api-v1-prod.json`,
 * `info.title` "Quo Public API", linked from the docs' own "Building with AI LLMs" guide) plus
 * Quo's hand-written docs (`www.quo.com/docs/mdx/api-reference/*`) and live probes against
 * `api.quo.com` and `status.quo.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The rebrand reaches the API host itself** (`lib/client.ts`). The OpenAPI document's own
 *     `servers[0].url` is `https://api.quo.com`, and every code sample in Quo's *current* docs
 *     calls that host — not the legacy `api.openphone.com`, which still answers identically
 *     (measured live) but is not what the vendor's own current material points at.
 *  2. **No `Bearer` prefix** (`auth/api-key.ts`). Quo's auth guide states this explicitly, and
 *     the OpenAPI security scheme has no prefix configured either.
 *  3. **The live error envelope does not match the OpenAPI document's own error schema**
 *     (`lib/client.ts`). The spec describes `{message, code, status, docs, title}`; the API
 *     actually answers `{"error": {"message", "key", "trace"}}` — measured on both an
 *     unauthenticated and a wrong-key request.
 *  4. **List Calls and List Messages share a `participants` query parameter with different
 *     limits** (`actions/call-list.ts`, `actions/message-list.ts`). Calls are 1:1 only
 *     (`maxItems: 1`); messages support up to 10 (a group conversation).
 *  5. **Contact `PATCH` replaces rather than merges** (`actions/contact-update.ts`) — per Quo's
 *     own description, an omitted `emails`/`phoneNumbers`/`customFields` array is deleted, not
 *     left alone.
 *  6. **The three conversation `mark-as-*` actions return the resource directly, with no `data`
 *     wrapper** — every other successful response in this API is `{"data": ...}`.
 *  7. **`task-create` needs exactly one of three link fields** (`actions/task-create.ts`) — Quo
 *     models this as three separate required-field variants, so this action validates it
 *     client-side rather than letting an ambiguous or empty request reach the API.
 *  8. **Rate-limit headers exist despite the docs never mentioning them** (`health/quota.ts`) —
 *     the IETF `ratelimit`/`ratelimit-policy` structured-field draft, not `X-RateLimit-*`,
 *     present even on a 401.
 *  9. **A newer beta webhook API exists and is deliberately not covered** (`actions/webhook-*`).
 *     Quo's changelog documents an open-beta unified `POST /webhooks` (since 2026-05-11) with a
 *     different signing scheme (Standard Webhooks/Svix) and a wider event set — the OpenAPI
 *     document this app was built against does not list it, so this app covers only the legacy,
 *     generally-available per-resource create endpoints. See the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import phoneNumberList from "./actions/phone-number-list.ts";
import phoneNumberGet from "./actions/phone-number-get.ts";

import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";

import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callSummaryGet from "./actions/call-summary-get.ts";
import callTranscriptGet from "./actions/call-transcript-get.ts";
import callVoicemailGet from "./actions/call-voicemail-get.ts";
import callRecordingsGet from "./actions/call-recordings-get.ts";

import contactCreate from "./actions/contact-create.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactCustomFieldList from "./actions/contact-custom-field-list.ts";

import conversationList from "./actions/conversation-list.ts";
import conversationMarkAsDone from "./actions/conversation-mark-as-done.ts";
import conversationMarkAsOpen from "./actions/conversation-mark-as-open.ts";
import conversationMarkAsRead from "./actions/conversation-mark-as-read.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import taskComplete from "./actions/task-complete.ts";
import taskReopen from "./actions/task-reopen.ts";
import taskAssign from "./actions/task-assign.ts";
import taskUnassign from "./actions/task-unassign.ts";
import taskChangeDueDate from "./actions/task-change-due-date.ts";
import taskRemoveDueDate from "./actions/task-remove-due-date.ts";
import taskLinkConversation from "./actions/task-link-conversation.ts";
import taskUnlinkConversation from "./actions/task-unlink-conversation.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookCreateMessage from "./actions/webhook-create-message.ts";
import webhookCreateCall from "./actions/webhook-create-call.ts";
import webhookCreateCallSummary from "./actions/webhook-create-call-summary.ts";
import webhookCreateCallTranscript from "./actions/webhook-create-call-transcript.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    phoneNumberList,
    phoneNumberGet,
    messageSend,
    messageList,
    messageGet,
    callList,
    callGet,
    callSummaryGet,
    callTranscriptGet,
    callVoicemailGet,
    callRecordingsGet,
    contactCreate,
    contactList,
    contactGet,
    contactUpdate,
    contactDelete,
    contactCustomFieldList,
    conversationList,
    conversationMarkAsDone,
    conversationMarkAsOpen,
    conversationMarkAsRead,
    taskList,
    taskCreate,
    taskGet,
    taskUpdate,
    taskDelete,
    taskComplete,
    taskReopen,
    taskAssign,
    taskUnassign,
    taskChangeDueDate,
    taskRemoveDueDate,
    taskLinkConversation,
    taskUnlinkConversation,
    userList,
    userGet,
    webhookList,
    webhookGet,
    webhookDelete,
    webhookCreateMessage,
    webhookCreateCall,
    webhookCreateCallSummary,
    webhookCreateCallTranscript,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
