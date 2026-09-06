/**
 * Livestorm — the webinar and virtual-events platform: create and manage events and their
 * sessions, register and manage participants, read chat/Q&A/recordings, and subscribe
 * webhooks, over the Livestorm Public API v1 (`api.livestorm.co/v1`).
 *
 * Every path, verb, query parameter, body field and header in this app was verified 2026-09-06
 * against the vendor's own OpenAPI 3.0.3 document — embedded server-side in the page data
 * ReadMe serves for `https://developers.livestorm.co/reference/*` (a live developer portal, not
 * a third-party integration directory) — plus live, unauthenticated and garbage-credential
 * probes against `api.livestorm.co` and `status.livestorm.co`. Nothing here came from a
 * sibling integration or marketing page.
 *
 * The four findings that shaped this app, each documented in full where it matters:
 *
 *  1. **The `Authorization` header must carry NO `Bearer ` prefix.** Livestorm's private API
 *     token and its separate OAuth2 (Doorkeeper) layer both read the same header; prefixing a
 *     private token with `Bearer ` routes it to the OAuth2 code path instead, where it is
 *     rejected as an invalid *access token* rather than checked as a private token. See
 *     `auth/api-key.ts` and `lib/client.ts`.
 *  2. **Registration data is a dynamic `fields: [{id, value}]` array**, not top-level
 *     `email`/`first_name` keys — `id` is a People Attribute slug, listable via
 *     `people-attribute-list`. See `lib/people.ts`.
 *  3. **The `/me` endpoint's documented schema is a copy-paste of `/organization`'s** — both
 *     describe an `organizations` resource (`name`/`slug`/`parent_id`). This app's `afterConnect`
 *     reads `/organization` instead, and `me-get` still calls the real endpoint and returns
 *     whatever it actually sends. See `lib/client.ts`.
 *  4. **One path parameter is spelled two ways for the same resource.** The vendor's own OAS
 *     names the session-people path parameter `period_id` on the `GET` list endpoint and `id`
 *     on the sibling `POST`/`DELETE` endpoints (Livestorm calls a session a "period"
 *     internally) — both address the same session ID.
 *
 * Two Auth mechanisms are documented (`api_key`, `oauth2`); only the private API token is
 * declared here, because the OAuth2 flow is for a browser app-install (a third party building
 * an installable Livestorm integration with its own registered client id/secret/redirect) —
 * not the headless, server-to-server case this app targets.
 *
 * `event-replace`/`session-replace` (`PUT`) are included alongside `event-update`/
 * `session-update` (`PATCH`) because the vendor documents both as separate, real endpoints —
 * but their request schemas are field-for-field identical and the vendor states no difference
 * in omitted-field handling, so `PATCH` is the recommended default; see each action's
 * description.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meGet from "./actions/me-get.ts";
import organizationGet from "./actions/organization-get.ts";

import eventList from "./actions/event-list.ts";
import eventCreate from "./actions/event-create.ts";
import eventGet from "./actions/event-get.ts";
import eventUpdate from "./actions/event-update.ts";
import eventReplace from "./actions/event-replace.ts";
import eventDelete from "./actions/event-delete.ts";
import eventTagAssign from "./actions/event-tag-assign.ts";
import eventTagRemove from "./actions/event-tag-remove.ts";
import eventPeopleList from "./actions/event-people-list.ts";
import eventPersonGet from "./actions/event-person-get.ts";
import eventSessionList from "./actions/event-session-list.ts";
import eventSessionCreate from "./actions/event-session-create.ts";

import sessionList from "./actions/session-list.ts";
import sessionGet from "./actions/session-get.ts";
import sessionUpdate from "./actions/session-update.ts";
import sessionReplace from "./actions/session-replace.ts";
import sessionDelete from "./actions/session-delete.ts";
import sessionPeopleList from "./actions/session-people-list.ts";
import sessionPersonGet from "./actions/session-person-get.ts";
import sessionPersonUpdate from "./actions/session-person-update.ts";
import sessionPersonRegister from "./actions/session-person-register.ts";
import sessionPersonRemoveByEmail from "./actions/session-person-remove-by-email.ts";
import sessionPersonRemove from "./actions/session-person-remove.ts";
import sessionPeopleBulkRegister from "./actions/session-people-bulk-register.ts";
import sessionChatMessagesList from "./actions/session-chat-messages-list.ts";
import sessionQuestionsList from "./actions/session-questions-list.ts";
import sessionRecordingsList from "./actions/session-recordings-list.ts";

import peopleList from "./actions/people-list.ts";
import peopleGet from "./actions/people-get.ts";
import peopleAttributeList from "./actions/people-attribute-list.ts";

import jobGet from "./actions/job-get.ts";
import jobTasksList from "./actions/job-tasks-list.ts";

import userList from "./actions/user-list.ts";
import userCreate from "./actions/user-create.ts";
import userDelete from "./actions/user-delete.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Identity
    meGet,
    organizationGet,
    // Events
    eventList,
    eventCreate,
    eventGet,
    eventUpdate,
    eventReplace,
    eventDelete,
    eventTagAssign,
    eventTagRemove,
    eventPeopleList,
    eventPersonGet,
    eventSessionList,
    eventSessionCreate,
    // Sessions
    sessionList,
    sessionGet,
    sessionUpdate,
    sessionReplace,
    sessionDelete,
    sessionPeopleList,
    sessionPersonGet,
    sessionPersonUpdate,
    sessionPersonRegister,
    sessionPersonRemoveByEmail,
    sessionPersonRemove,
    sessionPeopleBulkRegister,
    sessionChatMessagesList,
    sessionQuestionsList,
    sessionRecordingsList,
    // People
    peopleList,
    peopleGet,
    peopleAttributeList,
    // Jobs
    jobGet,
    jobTasksList,
    // Users
    userList,
    userCreate,
    userDelete,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
