/**
 * Twitch — the live-streaming platform: read channels, streams, videos, clips,
 * chat metadata, schedules and teams over the Helix REST API
 * (`api.twitch.tv/helix`), and update a broadcaster's own channel.
 *
 * Every path, verb, query parameter, body field and enum in this app was read
 * on 2026-08-11 from Twitch's own API reference
 * (`dev.twitch.tv/docs/api/reference/`, one 1,414,793-byte page carrying all 149
 * documented endpoints) and its authentication guide
 * (`dev.twitch.tv/docs/authentication/`, 35,227 bytes), plus live probes of
 * `api.twitch.tv`, `id.twitch.tv` and `status.twitch.com`. Nothing here came
 * from a third-party integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Authentication is TWO values that must agree** (`auth/shared.ts`). Every
 *     Helix request carries `Authorization: Bearer <token>` *and* `Client-Id:
 *     <client id>`, and Twitch rejects the pair when the client id is not the
 *     one the token was minted for. That is why the credential carries the
 *     client id — `sign` is the only hook that may stamp a header, and it
 *     receives nothing but the request and the credential.
 *  2. **That fact rules out the platform's `oauth2` type**
 *     (`auth/user-access-token.ts`). A host-driven authorization-code exchange
 *     stores `{accessToken, refreshToken, expiresAt, scope, tokenType}` — no
 *     client id — so an `oauth2`-typed method here would sign every request
 *     without `Client-Id` and Twitch would 401 all of them. Both methods are
 *     therefore `custom`.
 *  3. **App and user tokens are not interchangeable**, and the reference marks
 *     which each endpoint needs. 29 of the 149 endpoints take either with no
 *     scope; the rest need a user token, usually with a named scope. Each auth
 *     method here says what it reaches, each scoped action names its scope, and
 *     both `test` hooks refuse a token of the wrong kind rather than letting it
 *     fail later inside a run.
 *  4. **The status page is on a different host than it looks, and covers less
 *     than it looks** (`health/service.ts`, `health/api-status.ts`).
 *     `status.twitch.tv` 302-redirects to `status.twitch.com`, and the page's
 *     six components are Login, Web, Chat, Video ×2 and Purchases — with no
 *     component for the Helix API at all.
 *
 * One vendor quirk worth knowing before writing a workflow: **multi-valued
 * query parameters repeat the key** (`id=1&id=2`), and comma-joining them does
 * not error — it looks up one nonexistent id and returns an empty list. See
 * `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import appAccessToken from "./auth/app-access-token.ts";
import userAccessToken from "./auth/user-access-token.ts";

// Users and channels
import getUsers from "./actions/get-users.ts";
import getChannelInformation from "./actions/get-channel-information.ts";
import modifyChannelInformation from "./actions/modify-channel-information.ts";
import getChannelFollowers from "./actions/get-channel-followers.ts";
import getFollowedChannels from "./actions/get-followed-channels.ts";

// Streams and schedule
import getStreams from "./actions/get-streams.ts";
import getFollowedStreams from "./actions/get-followed-streams.ts";
import createStreamMarker from "./actions/create-stream-marker.ts";
import getChannelStreamSchedule from "./actions/get-channel-stream-schedule.ts";

// Videos and clips
import getVideos from "./actions/get-videos.ts";
import getClips from "./actions/get-clips.ts";
import createClip from "./actions/create-clip.ts";

// Categories and search
import getGames from "./actions/get-games.ts";
import getTopGames from "./actions/get-top-games.ts";
import searchCategories from "./actions/search-categories.ts";
import searchChannels from "./actions/search-channels.ts";

// Chat
import getChatSettings from "./actions/get-chat-settings.ts";
import sendChatAnnouncement from "./actions/send-chat-announcement.ts";
import getGlobalEmotes from "./actions/get-global-emotes.ts";
import getChannelEmotes from "./actions/get-channel-emotes.ts";
import getGlobalChatBadges from "./actions/get-global-chat-badges.ts";
import getChannelChatBadges from "./actions/get-channel-chat-badges.ts";
import getUserChatColor from "./actions/get-user-chat-color.ts";
import getCheermotes from "./actions/get-cheermotes.ts";

// Teams, moderation and metadata
import getTeams from "./actions/get-teams.ts";
import getChannelTeams from "./actions/get-channel-teams.ts";
import getModerators from "./actions/get-moderators.ts";
import getContentClassificationLabels from "./actions/get-content-classification-labels.ts";

import service from "./health/service.ts";
import apiStatus from "./health/api-status.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users and channels
    getUsers,
    getChannelInformation,
    modifyChannelInformation,
    getChannelFollowers,
    getFollowedChannels,
    // Streams and schedule
    getStreams,
    getFollowedStreams,
    createStreamMarker,
    getChannelStreamSchedule,
    // Videos and clips
    getVideos,
    getClips,
    createClip,
    // Categories and search
    getGames,
    getTopGames,
    searchCategories,
    searchChannels,
    // Chat
    getChatSettings,
    sendChatAnnouncement,
    getGlobalEmotes,
    getChannelEmotes,
    getGlobalChatBadges,
    getChannelChatBadges,
    getUserChatColor,
    getCheermotes,
    // Teams, moderation and metadata
    getTeams,
    getChannelTeams,
    getModerators,
    getContentClassificationLabels,
  ],
  /**
   * Two methods for Twitch's two token kinds, in the order a new connection
   * should consider them: the app token is simpler and enough for every public
   * read, the user token is required for anything about a specific
   * broadcaster's own data and also reaches everything the app token does.
   */
  auth: [appAccessToken, userAccessToken],
  healthChecks: [service, apiStatus, api, quota],
} satisfies AppDefinition;
