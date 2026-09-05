/**
 * Tumblr — read and post to blogs, manage likes and follows, and check a
 * connected user's dashboard, over the Tumblr API v2 (`api.tumblr.com`).
 *
 * Every path, verb, query parameter, body field and response field in this
 * app was verified on 2026-09-05 against Tumblr's own hand-written API
 * reference (`https://www.tumblr.com/docs/en/api/v2`, ~324 KB HTML — Tumblr
 * publishes prose documentation, not an OpenAPI document) plus live probes
 * against `api.tumblr.com` and Automattic's shared status page. Nothing here
 * came from a third-party integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **OAuth 2.0, not OAuth 1.0a** (`auth/oauth2.ts`). The doc's own
 *     "Authentication" section defines its `OAuth`-level methods as needing
 *     "a signed request that meets the OAuth 1.0a Protocol" — read alone,
 *     that says HMAC-SHA1 request signing is mandatory. A later section on
 *     the same page documents a complete, current OAuth 2.0 implementation
 *     (Authorization Code + refresh, plain `Authorization: Bearer` header)
 *     that reaches those exact same methods, per the vendor's own worked
 *     example. This app implements OAuth 2.0 only.
 *  2. **A 401's message text is randomised; its numeric code is not**
 *     (`lib/client.ts`, `auth/oauth2.ts`). Three consecutive unauthenticated
 *     calls to the same endpoint returned three different sentences under
 *     the same `code: 0`; a bad token instead consistently returns
 *     `code: 1013`. Every failure classification in this app branches on
 *     `code`, never on `detail`'s wording.
 *  3. **The real status page isn't at the obvious hostname**
 *     (`health/service.ts`). `status.tumblr.com` resolves to an ordinary
 *     Tumblr blog carrying a login-phishing warning, not a status page.
 *     Automattic's actual shared status page — which does name Tumblr,
 *     specifically — lives at `automatticstatus.com`, runs different
 *     status-page software (Zoho Site24x7, not Statuspage.io), and its
 *     machine-readable form is an RSS feed shaped as one snapshot per
 *     component rather than a log of incident updates.
 *
 * ## One documented endpoint is deliberately not implemented
 *
 * `GET /v2/tagged` is the one method on the whole reference page whose
 * "Request Parameters" table is followed immediately by the next method —
 * with no "Response" section at all, unlike every other endpoint. Rather than
 * guess its response shape, this app leaves it out. See `lib/client.ts`.
 *
 * ## Two auth levels, one signing story
 *
 * The doc's per-method table marks each method `None`, `API key` or `OAuth`.
 * This app signs every request with the connected account's OAuth2 bearer
 * token regardless of which level a given method documents — including the
 * `API key`-level ones (blog info, avatar\*, likes, notes) — because the
 * vendor's own OAuth2 walkthrough sends that same bearer header to an
 * `OAuth`-level method (`/v2/user/info`) and gets the authenticated response,
 * and OAuth is documented as the stronger of the two credential forms.
 * (\*`blog-avatar-get` is the one action with `requiresAuth: false`, since its
 * `None` level needs no credential at all — see that file for why.)
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import blogInfoGet from "./actions/blog-info-get.ts";
import blogAvatarGet from "./actions/blog-avatar-get.ts";
import blogLikesList from "./actions/blog-likes-list.ts";
import blogFollowingList from "./actions/blog-following-list.ts";
import blogFollowersList from "./actions/blog-followers-list.ts";
import blogPostsList from "./actions/blog-posts-list.ts";
import blogPostsQueueList from "./actions/blog-posts-queue-list.ts";
import blogPostsDraftList from "./actions/blog-posts-draft-list.ts";
import blogPostsSubmissionList from "./actions/blog-posts-submission-list.ts";

import postCreate from "./actions/post-create.ts";
import postGet from "./actions/post-get.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import postNotesList from "./actions/post-notes-list.ts";

import userInfoGet from "./actions/user-info-get.ts";
import userLimitsGet from "./actions/user-limits-get.ts";
import userDashboardGet from "./actions/user-dashboard-get.ts";
import userLikesList from "./actions/user-likes-list.ts";
import userFollowingList from "./actions/user-following-list.ts";
import userFollow from "./actions/user-follow.ts";
import userUnfollow from "./actions/user-unfollow.ts";
import userLike from "./actions/user-like.ts";
import userUnlike from "./actions/user-unlike.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Blog
    blogInfoGet,
    blogAvatarGet,
    blogLikesList,
    blogFollowingList,
    blogFollowersList,
    blogPostsList,
    blogPostsQueueList,
    blogPostsDraftList,
    blogPostsSubmissionList,
    // Posts (NPF)
    postCreate,
    postGet,
    postUpdate,
    postDelete,
    postNotesList,
    // User
    userInfoGet,
    userLimitsGet,
    userDashboardGet,
    userLikesList,
    userFollowingList,
    userFollow,
    userUnfollow,
    userLike,
    userUnlike,
  ],
  auth: [oauth2],
  healthChecks: [service],
} satisfies AppDefinition;
