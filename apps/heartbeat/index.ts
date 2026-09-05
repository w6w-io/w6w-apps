/**
 * Heartbeat (heartbeat.chat) — the community platform: members, groups,
 * discussion/chat/voice channels, events, courses and a document wiki, over
 * Heartbeat's own public REST API (`api.heartbeat.chat/v0`).
 *
 * Every path, verb, parameter and request-body field in this app was read off
 * Heartbeat's own OpenAPI 3.0 document — embedded verbatim as `oasDefinition`
 * inside the `__NEXT_DATA__` payload of its ReadMe-hosted reference pages
 * (`https://heartbeat.readme.io/reference/*`, fetched 2026-09-05,
 * `info.version` `1.0.0`) — plus live probes against `api.heartbeat.chat` and
 * `status.heartbeat.chat` the same day. See `lib/client.ts` for the three
 * findings that shaped the request/response handling, and `auth/api-key.ts`
 * for why the credential probe is `GET /v0/roles`.
 *
 * **Response shapes are documented unevenly.** Heartbeat's spec fully
 * documents every REQUEST (path, verb, body) but leaves ~19 of 54 write
 * endpoints (create/update/delete on users, groups, channels, voice channels,
 * channel categories, events, and a few others) with a bare `200` response
 * and no schema at all. Two (`createDirectMessage`, `createChatMessage`) are
 * confirmed `204 No Content`. Rather than guessing at an undocumented body's
 * shape, those actions declare an empty `output` and pass through whatever
 * (if anything) the call actually returns — the request itself is fully
 * verified even where the response is not.
 *
 * **Left out entirely:** a member's `profilePicture` (a base64 data-URI field
 * on create/update, with no existing Param type that safely maps to it), and
 * a lesson's `hero` (video block) and `communityEmbedCards` — see
 * `create-lesson.ts` for why those two are always sent empty/null rather than
 * modeled.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getUser from "./actions/get-user.ts";
import listUsers from "./actions/list-users.ts";
import findUser from "./actions/find-user.ts";
import createUser from "./actions/create-user.ts";
import updateUser from "./actions/update-user.ts";
import deleteUser from "./actions/delete-user.ts";
import reactivateUser from "./actions/reactivate-user.ts";
import createPendingUser from "./actions/create-pending-user.ts";

import listInvitations from "./actions/list-invitations.ts";
import createInvitation from "./actions/create-invitation.ts";
import updateInvitation from "./actions/update-invitation.ts";

import getNotifications from "./actions/get-notifications.ts";
import listRoles from "./actions/list-roles.ts";

import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import createGroup from "./actions/create-group.ts";
import updateGroup from "./actions/update-group.ts";
import deleteGroup from "./actions/delete-group.ts";
import addToGroup from "./actions/add-to-group.ts";
import removeFromGroup from "./actions/remove-from-group.ts";

import listChannelCategories from "./actions/list-channel-categories.ts";
import createChannelCategory from "./actions/create-channel-category.ts";
import updateChannelCategory from "./actions/update-channel-category.ts";
import deleteChannelCategory from "./actions/delete-channel-category.ts";

import listChannels from "./actions/list-channels.ts";
import createChannel from "./actions/create-channel.ts";
import updateChannel from "./actions/update-channel.ts";
import deleteChannel from "./actions/delete-channel.ts";
import createVoiceChannel from "./actions/create-voice-channel.ts";
import updateVoiceChannel from "./actions/update-voice-channel.ts";

import listThreads from "./actions/list-threads.ts";
import getThread from "./actions/get-thread.ts";
import createThread from "./actions/create-thread.ts";
import createComment from "./actions/create-comment.ts";

import createDirectChat from "./actions/create-direct-chat.ts";
import createDirectMessage from "./actions/create-direct-message.ts";
import listDirectMessages from "./actions/list-direct-messages.ts";
import createChatMessage from "./actions/create-chat-message.ts";
import listChatChannelMessages from "./actions/list-chat-channel-messages.ts";

import listEvents from "./actions/list-events.ts";
import createEvent from "./actions/create-event.ts";
import getEvent from "./actions/get-event.ts";
import listEventInstances from "./actions/list-event-instances.ts";
import getEventAttendance from "./actions/get-event-attendance.ts";

import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import listCourses from "./actions/list-courses.ts";
import getLesson from "./actions/get-lesson.ts";
import createLesson from "./actions/create-lesson.ts";
import updateLesson from "./actions/update-lesson.ts";
import listVideos from "./actions/list-videos.ts";

import listDocuments from "./actions/list-documents.ts";
import getDocument from "./actions/get-document.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users
    getUser,
    listUsers,
    findUser,
    createUser,
    updateUser,
    deleteUser,
    reactivateUser,
    createPendingUser,
    // Invitations
    listInvitations,
    createInvitation,
    updateInvitation,
    // Notifications / roles
    getNotifications,
    listRoles,
    // Groups
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    addToGroup,
    removeFromGroup,
    // Channel categories
    listChannelCategories,
    createChannelCategory,
    updateChannelCategory,
    deleteChannelCategory,
    // Channels (posts/chat) and voice channels
    listChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    createVoiceChannel,
    updateVoiceChannel,
    // Threads / comments
    listThreads,
    getThread,
    createThread,
    createComment,
    // Direct chats/messages, chat-channel messages
    createDirectChat,
    createDirectMessage,
    listDirectMessages,
    createChatMessage,
    listChatChannelMessages,
    // Events
    listEvents,
    createEvent,
    getEvent,
    listEventInstances,
    getEventAttendance,
    // Webhooks
    listWebhooks,
    createWebhook,
    deleteWebhook,
    // Courses / lessons / videos
    listCourses,
    getLesson,
    createLesson,
    updateLesson,
    listVideos,
    // Documents
    listDocuments,
    getDocument,
  ],
  // API key only. Heartbeat publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
