/**
 * Canny — product feedback and feature request management (canny.io), over
 * Canny's REST API at `canny.io/api`.
 *
 * Every path, argument and response field in this app was read off Canny's
 * own generated API reference (`developers.canny.io/api-reference`, verified
 * 2026-08-29) — see `lib/client.ts` for exactly how that reference was
 * recovered (it is a client-rendered SPA with no static HTML) and live
 * probes that confirmed it. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped this app, documented in full where they matter:
 *
 *  1. **Auth is a JSON body field, never a header.** `apiKey` is merged into
 *     the request body by the `sign` hook (`auth/api-key.ts`), the same
 *     shape Mandrill's auth uses in this pack for the identical problem.
 *  2. **Canny has no scoped-token concept.** One secret, workspace-wide key
 *     can read and write everything — there is no "narrower" credential to
 *     prefer for the health probe the way Apify's scoped tokens allow.
 *  3. **The reference's own prose has at least two copy-paste errors**:
 *     `categories/list`'s "Returns" text says it returns "tag objects" (it
 *     returns Category objects — confirmed against the same page's own
 *     example response), and `users/list`'s "Returns" text says "an array of
 *     users" when the actual response is the same `{users, hasNextPage,
 *     cursor}` envelope every other v2 list endpoint uses. Both are followed
 *     as their *example responses* show, not their prose.
 *
 * Left out, and why: `posts/link_jira`/`unlink_jira` (real endpoints, but
 * only usable once a workspace has connected Jira — a dependency this app
 * cannot express or verify) and the Autopilot/Ideas/Insights/Opportunities/
 * Groups surface (a separate AI feature with its own credit system, not part
 * of the core feedback loop this app covers). `users/find_or_create` is
 * real but documented **deprecated** in favour of `users/create_or_update`
 * (`actions/user-upsert.ts`), so this app only calls the latter.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import boardList from "./actions/board-list.ts";
import boardGet from "./actions/board-get.ts";

import categoryList from "./actions/category-list.ts";
import categoryGet from "./actions/category-get.ts";
import categoryCreate from "./actions/category-create.ts";
import categoryDelete from "./actions/category-delete.ts";

import postList from "./actions/post-list.ts";
import postGet from "./actions/post-get.ts";
import postCreate from "./actions/post-create.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import postChangeStatus from "./actions/post-change-status.ts";
import postChangeCategory from "./actions/post-change-category.ts";
import postChangeBoard from "./actions/post-change-board.ts";
import postAddTag from "./actions/post-add-tag.ts";
import postRemoveTag from "./actions/post-remove-tag.ts";
import postMerge from "./actions/post-merge.ts";

import voteList from "./actions/vote-list.ts";
import voteGet from "./actions/vote-get.ts";
import voteCreate from "./actions/vote-create.ts";
import voteDelete from "./actions/vote-delete.ts";

import commentList from "./actions/comment-list.ts";
import commentGet from "./actions/comment-get.ts";
import commentCreate from "./actions/comment-create.ts";
import commentDelete from "./actions/comment-delete.ts";

import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagCreate from "./actions/tag-create.ts";

import companyList from "./actions/company-list.ts";
import companyUpdate from "./actions/company-update.ts";
import companyDelete from "./actions/company-delete.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userUpsert from "./actions/user-upsert.ts";
import userDelete from "./actions/user-delete.ts";
import userRemoveFromCompany from "./actions/user-remove-from-company.ts";

import entryCreate from "./actions/entry-create.ts";
import entryList from "./actions/entry-list.ts";

import statusChangeList from "./actions/status-change-list.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Boards
    boardList,
    boardGet,
    // Categories
    categoryList,
    categoryGet,
    categoryCreate,
    categoryDelete,
    // Posts
    postList,
    postGet,
    postCreate,
    postUpdate,
    postDelete,
    postChangeStatus,
    postChangeCategory,
    postChangeBoard,
    postAddTag,
    postRemoveTag,
    postMerge,
    // Votes
    voteList,
    voteGet,
    voteCreate,
    voteDelete,
    // Comments
    commentList,
    commentGet,
    commentCreate,
    commentDelete,
    // Tags
    tagList,
    tagGet,
    tagCreate,
    // Companies
    companyList,
    companyUpdate,
    companyDelete,
    // Users
    userList,
    userGet,
    userUpsert,
    userDelete,
    userRemoveFromCompany,
    // Changelog
    entryCreate,
    entryList,
    // Status changes
    statusChangeList,
  ],
  // API key only. Canny publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
