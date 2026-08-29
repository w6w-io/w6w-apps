/**
 * Chatwork — the Japan-based business team chat platform (chatwork.com):
 * chats, messages, tasks, files, invite links and contacts, over the
 * Chatwork API v2 (`api.chatwork.com/v2`).
 *
 * Every path, verb, parameter, request/response field and enum in this app
 * was verified on 2026-08-29 against Chatwork's own OpenAPI 3.1 document —
 * embedded server-side in `developer.chatwork.com`'s reference pages
 * (`info.version` `v2`, licensed at `github.com/chatwork/chatwork-api-spec`)
 * — plus live probes against `api.chatwork.com`. Nothing here came from a
 * third-party integration directory. All 32 operations the document declares
 * are implemented; none were skipped.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Auth is a plain header, not Bearer.** `X-ChatWorkToken: <token>` —
 *     confirmed against the security scheme and a live 401 probe. See
 *     `auth/api-token.ts`.
 *  2. **Empty lists answer `204`, not `200 []`.** Five endpoints document
 *     this; `lib/client.ts`'s `list()` normalises both to `[]`. Getting this
 *     wrong reads as "the request failed" for the common case of an empty
 *     chat.
 *  3. **`GET /rooms/{room_id}/messages` is a stateful per-token cursor.**
 *     With `force` off, it returns only what changed since this same
 *     connection's last read — not the chat's full history. See
 *     `actions/room-message-list.ts`.
 *
 * No machine-readable vendor status feed was found (`health/service.ts`
 * documents the search); the only quota surface Chatwork publishes is the
 * `X-RateLimit-*` headers on every successful response (`health/quota.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import meGet from "./actions/me-get.ts";
import myStatusGet from "./actions/my-status-get.ts";
import myTasksList from "./actions/my-tasks-list.ts";

import contactList from "./actions/contact-list.ts";

import roomList from "./actions/room-list.ts";
import roomCreate from "./actions/room-create.ts";
import roomGet from "./actions/room-get.ts";
import roomUpdate from "./actions/room-update.ts";
import roomDelete from "./actions/room-delete.ts";

import roomMemberList from "./actions/room-member-list.ts";
import roomMemberUpdate from "./actions/room-member-update.ts";

import roomMessageList from "./actions/room-message-list.ts";
import roomMessageSend from "./actions/room-message-send.ts";
import roomMessageMarkRead from "./actions/room-message-mark-read.ts";
import roomMessageMarkUnread from "./actions/room-message-mark-unread.ts";
import roomMessageGet from "./actions/room-message-get.ts";
import roomMessageUpdate from "./actions/room-message-update.ts";
import roomMessageDelete from "./actions/room-message-delete.ts";

import roomTaskList from "./actions/room-task-list.ts";
import roomTaskCreate from "./actions/room-task-create.ts";
import roomTaskGet from "./actions/room-task-get.ts";
import roomTaskStatusUpdate from "./actions/room-task-status-update.ts";

import roomFileList from "./actions/room-file-list.ts";
import roomFileUpload from "./actions/room-file-upload.ts";
import roomFileGet from "./actions/room-file-get.ts";

import roomLinkGet from "./actions/room-link-get.ts";
import roomLinkCreate from "./actions/room-link-create.ts";
import roomLinkUpdate from "./actions/room-link-update.ts";
import roomLinkDelete from "./actions/room-link-delete.ts";

import incomingRequestList from "./actions/incoming-request-list.ts";
import incomingRequestApprove from "./actions/incoming-request-approve.ts";
import incomingRequestReject from "./actions/incoming-request-reject.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Profile
    meGet,
    myStatusGet,
    myTasksList,
    // Contacts
    contactList,
    // Rooms (chats)
    roomList,
    roomCreate,
    roomGet,
    roomUpdate,
    roomDelete,
    // Members
    roomMemberList,
    roomMemberUpdate,
    // Messages
    roomMessageList,
    roomMessageSend,
    roomMessageMarkRead,
    roomMessageMarkUnread,
    roomMessageGet,
    roomMessageUpdate,
    roomMessageDelete,
    // Tasks
    roomTaskList,
    roomTaskCreate,
    roomTaskGet,
    roomTaskStatusUpdate,
    // Files
    roomFileList,
    roomFileUpload,
    roomFileGet,
    // Invite links
    roomLinkGet,
    roomLinkCreate,
    roomLinkUpdate,
    roomLinkDelete,
    // Contact requests
    incomingRequestList,
    incomingRequestApprove,
    incomingRequestReject,
  ],
  // Personal API token only — see auth/api-token.ts for why OAuth2 is not implemented.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
