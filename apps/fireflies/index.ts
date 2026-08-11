/**
 * Fireflies.ai — meeting notetaker, transcripts and AskFred.
 *
 * Fireflies has no REST surface at all: every operation is a POST to the single
 * GraphQL endpoint `https://api.fireflies.ai/graphql`. Each action below owns
 * its own query or mutation document and exposes typed params, rather than the
 * app shipping one "run any GraphQL" passthrough — a passthrough would push the
 * schema onto the workflow author and make every param unvalidated.
 *
 * Three things about this vendor that shape the code, all measured against the
 * live API on 2026-08-11 rather than assumed:
 *
 *   - **A rejected credential answers HTTP 500.** Not 401, not 403 — an
 *     unauthenticated POST returns `HTTP 500` carrying a well-formed GraphQL
 *     `errors[]` with `code: "auth_failed"`. `lib/client.ts` therefore reads
 *     `errors[]` BEFORE the status code, and `health/api.ts` treats that exact
 *     500 as a PASS, because it proves the endpoint parsed the request and the
 *     auth layer ran.
 *   - **Three field groups are paid-plan-gated.** `audio_url`, `video_url` and
 *     `analytics` on `Transcript` each require Pro or higher, so requesting
 *     them by default would fail every read for a Free-plan connection. They
 *     are opt-in booleans on the actions that can return them.
 *   - **Rate limits are severe and invisible.** 50 requests per DAY on the Free
 *     plan, and no `X-RateLimit-*` headers to see it coming — which is why the
 *     `quota` check is a declared absence and the `api` check is unsigned.
 *
 * Deliberately absent: the Webhooks / Webhooks V2 surface (a Trigger, not an
 * Action), the Realtime API (a WebSocket stream, which `ctx.fetch` cannot
 * carry), and `uploadAudio`'s `download_auth` (a third-party media credential
 * that does not belong in Action params). See the README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import transcriptGet from "./actions/transcript-get.ts";
import transcriptSearch from "./actions/transcript-search.ts";
import transcriptDelete from "./actions/transcript-delete.ts";
import meetingTitleUpdate from "./actions/meeting-title-update.ts";
import meetingPrivacyUpdate from "./actions/meeting-privacy-update.ts";
import meetingChannelUpdate from "./actions/meeting-channel-update.ts";
import meetingShare from "./actions/meeting-share.ts";
import meetingShareRevoke from "./actions/meeting-share-revoke.ts";
import audioUpload from "./actions/audio-upload.ts";

import activeMeetingList from "./actions/active-meeting-list.ts";
import liveMeetingJoin from "./actions/live-meeting-join.ts";
import liveMeetingStateSet from "./actions/live-meeting-state-set.ts";
import liveActionItemCreate from "./actions/live-action-item-create.ts";

import biteGet from "./actions/bite-get.ts";
import biteSearch from "./actions/bite-search.ts";
import biteCreate from "./actions/bite-create.ts";

import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import userRoleSet from "./actions/user-role-set.ts";

import contactList from "./actions/contact-list.ts";
import channelList from "./actions/channel-list.ts";
import appOutputList from "./actions/app-output-list.ts";
import analyticsGet from "./actions/analytics-get.ts";

import askfredAsk from "./actions/askfred-ask.ts";
import askfredContinue from "./actions/askfred-continue.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // transcripts / meetings
    transcriptGet,
    transcriptSearch,
    transcriptDelete,
    meetingTitleUpdate,
    meetingPrivacyUpdate,
    meetingChannelUpdate,
    meetingShare,
    meetingShareRevoke,
    audioUpload,
    // live meetings — the notetaker while a call is running
    activeMeetingList,
    liveMeetingJoin,
    liveMeetingStateSet,
    liveActionItemCreate,
    // soundbites
    biteGet,
    biteSearch,
    biteCreate,
    // team
    userGet,
    userList,
    userRoleSet,
    // lookups + reporting
    contactList,
    channelList,
    appOutputList,
    analyticsGet,
    // AskFred
    askfredAsk,
    askfredContinue,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
