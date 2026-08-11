/**
 * Mattermost — post, edit, thread and search messages, and manage channels and
 * their members, against a Mattermost server's REST API v4 (`<server>/api/v4/…`),
 * on Mattermost Cloud **and** self-hosted servers alike.
 *
 * Every path, verb, body field and enum in this app was verified on 2026-08-11
 * against Mattermost's own OpenAPI source (`mattermost/mattermost-api-reference`,
 * `v4/source/*.yaml` — the files `api.mattermost.com` is generated from) plus
 * live probes against `community.mattermost.com`, running **server 11.11.0**.
 * Nothing here came from a third-party integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **There is no vendor host — the server is the host** (`lib/client.ts`).
 *     Mattermost documents every example against `http://localhost:8065`, so the
 *     URL is an Auth field and the manifest allows `*`.
 *  2. **A post list is `{order, posts}`, not an array**
 *     (`actions/posts-for-channel.ts`). `posts` is keyed by id and `order` holds
 *     the display order; `Object.values(posts)` silently loses it.
 *  3. **`/api/v4/system/ping` is unauthenticated** (`auth/access-token.ts`), so
 *     it is disqualified as the credential probe and used instead as the
 *     per-connection `instance` check. `GET /api/v4/users/me` is the credential
 *     probe, and its body carries no token.
 *  4. **Rate-limit headers exist but are off by default** (`health/quota.ts`).
 *     That makes `quota` a live probe rather than a declared absence — the only
 *     one in this batch — at `informational` severity, because a server whose
 *     operator left the default alone publishes nothing.
 *
 * Post editing uses `PUT /posts/{id}/patch`, never the bare `PUT /posts/{id}`,
 * so an edit cannot silently blank a post's files or props.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import postCreate from "./actions/post-create.ts";
import postGet from "./actions/post-get.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import postsForChannel from "./actions/posts-for-channel.ts";
import postThread from "./actions/post-thread.ts";
import postSearch from "./actions/post-search.ts";

import channelGetByName from "./actions/channel-get-by-name.ts";
import channelCreate from "./actions/channel-create.ts";
import channelDirectCreate from "./actions/channel-direct-create.ts";
import channelMemberAdd from "./actions/channel-member-add.ts";
import channelMembersList from "./actions/channel-members-list.ts";
import channelsForUser from "./actions/channels-for-user.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // posts
    postCreate,
    postGet,
    postUpdate,
    postDelete,
    postsForChannel,
    postThread,
    postSearch,
    // channels — start at channel-get-by-name, which turns a URL into an id
    channelGetByName,
    channelCreate,
    channelDirectCreate,
    channelMemberAdd,
    channelMembersList,
    channelsForUser,
  ],
  // Personal access token / bot token only. Mattermost's session tokens use the
  // same Bearer header but expire, and `sign` is network-less — see
  // auth/access-token.ts for the full reasoning.
  auth: [accessToken],
  healthChecks: [service, instance, quota],
} satisfies AppDefinition;
