/**
 * Vimeo — video hosting and management on the REST API at `api.vimeo.com`.
 *
 * Every path, verb, parameter, body field and enum in this app was verified on
 * 2026-08-11 against Vimeo's own developer site: the per-resource OpenAPI
 * documents embedded in `developer.vimeo.com/api/reference/<group>` (the pages
 * ship the spec inline, so it is the vendor's machine-readable source rather
 * than scraped prose), the response schemas under
 * `/api/reference/response/<name>`, and the guides `/api/authentication`,
 * `/api/common-formats`, `/api/upload/videos` and `/guidelines/rate-limiting` —
 * plus live probes against `api.vimeo.com` and `www.vimeostatus.com`. Nothing
 * came from a third-party integration directory or from a sibling app here.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The version lives in the `Accept` header** (`lib/client.ts`). There is
 *     no `/v3/` path prefix; `Accept: application/vnd.vimeo.*+json;version=3.4`
 *     is what pins the contract, and it is sent on every call including both
 *     probes.
 *  2. **`fields` is the rate limit, not an optimisation** (`lib/params.ts`,
 *     `health/quota.ts`). Vimeo doubles the per-minute quota for any request
 *     using it — and reports `X-RateLimit-Limit`/`-Remaining` as the *already
 *     doubled* figure regardless, so a caller who reads the header without
 *     filtering over-reads their headroom by 100%.
 *  3. **The representations carry cleartext passwords** (`lib/client.ts`,
 *     `auth/access-token.ts`). `video.password`, `album.privacy.password` and
 *     `user.preferences.videos.password` are all default-returned. None is this
 *     connection's credential, but both probes here use `fields` so they
 *     provably cannot echo one.
 *  4. **The status page is not on the host you would guess**
 *     (`health/service.ts`). `status.vimeo.com` 301-redirects to
 *     `www.vimeostatus.com`, and a redirect across hosts is exactly what a
 *     health check's `network.allow` refuses.
 *
 * Two naming collisions run through the whole API and are worth knowing before
 * reading any action: **folders are `projects`** in every path, and
 * **showcases are `albums`** in every path while their own URIs say
 * `/showcases/`. All the id params accept either form.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import videoList from "./actions/video-list.ts";
import videoGet from "./actions/video-get.ts";
import videoUpdate from "./actions/video-update.ts";
import videoDelete from "./actions/video-delete.ts";
import videoSearch from "./actions/video-search.ts";
import videoUploadPull from "./actions/video-upload-pull.ts";

import userGet from "./actions/user-get.ts";
import userUpdate from "./actions/user-update.ts";

import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderDelete from "./actions/folder-delete.ts";
import folderItemList from "./actions/folder-item-list.ts";
import folderVideoList from "./actions/folder-video-list.ts";
import folderVideoAdd from "./actions/folder-video-add.ts";
import folderVideoRemove from "./actions/folder-video-remove.ts";

import showcaseList from "./actions/showcase-list.ts";
import showcaseGet from "./actions/showcase-get.ts";
import showcaseCreate from "./actions/showcase-create.ts";
import showcaseUpdate from "./actions/showcase-update.ts";
import showcaseDelete from "./actions/showcase-delete.ts";
import showcaseVideoList from "./actions/showcase-video-list.ts";
import showcaseVideoAdd from "./actions/showcase-video-add.ts";
import showcaseVideoRemove from "./actions/showcase-video-remove.ts";
import showcaseVideoReplace from "./actions/showcase-video-replace.ts";

import commentList from "./actions/comment-list.ts";
import commentGet from "./actions/comment-get.ts";
import commentCreate from "./actions/comment-create.ts";
import commentUpdate from "./actions/comment-update.ts";
import commentDelete from "./actions/comment-delete.ts";
import commentReplyList from "./actions/comment-reply-list.ts";
import commentReplyCreate from "./actions/comment-reply-create.ts";

import likeList from "./actions/like-list.ts";
import likeAdd from "./actions/like-add.ts";
import likeRemove from "./actions/like-remove.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // videos
    videoList,
    videoGet,
    videoUpdate,
    videoDelete,
    videoSearch,
    videoUploadPull,
    // account
    userGet,
    userUpdate,
    // folders (`projects` on the wire)
    folderList,
    folderGet,
    folderCreate,
    folderUpdate,
    folderDelete,
    folderItemList,
    folderVideoList,
    folderVideoAdd,
    folderVideoRemove,
    // showcases (`albums` on the wire)
    showcaseList,
    showcaseGet,
    showcaseCreate,
    showcaseUpdate,
    showcaseDelete,
    showcaseVideoList,
    showcaseVideoAdd,
    showcaseVideoRemove,
    showcaseVideoReplace,
    // comments
    commentList,
    commentGet,
    commentCreate,
    commentUpdate,
    commentDelete,
    commentReplyList,
    commentReplyCreate,
    // likes
    likeList,
    likeAdd,
    likeRemove,
  ],
  // One auth method. Vimeo's four OAuth 2.0 grants and its personal access
  // tokens all produce the same artefact — an opaque bearer string — so this
  // app takes the token itself rather than modelling a redirect flow whose
  // client id, secret and redirect URI are per-installation. See
  // `auth/access-token.ts`.
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
