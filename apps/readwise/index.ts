/**
 * Readwise — highlights and notes aggregation, over the classic Readwise API
 * (`readwise.io/api/v2/...`).
 *
 * Every path, verb, field and status code in this app was verified on
 * 2026-08-29 against Readwise's own reference at `readwise.io/api_deets`
 * (confirmed 200 OK, 159,497 bytes) plus live, unauthenticated probes against
 * `readwise.io`. Nothing here came from a third-party integration directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **Two products share the domain, and this app covers only one.**
 *     Readwise's *Reader* product has its own, separate `api/v3` surface,
 *     linked from `/api_deets` itself ("Looking for the API docs for Reader?
 *     See here."). This app implements only the classic Highlights/Books
 *     surface `/api_deets` documents; nothing from Reader is used.
 *  2. **The auth scheme is `Token`, not `Bearer`.** Verified live: sending
 *     `Authorization: Bearer <token>` is indistinguishable from sending no
 *     credential at all (`auth/api-token.ts`).
 *  3. **The vendor gives you a dedicated, non-leaking auth check.**
 *     `GET /api/v2/auth/` answers `204` with no body on success, so it cannot
 *     echo the caller's own token the way a whoami endpoint would.
 *
 * No public status page could be found for Readwise (`health/service.ts`
 * documents every host checked), and Readwise exposes no proactive
 * rate-limit/quota header on a normal response — only a `Retry-After` on an
 * already-returned `429` — so this app declares no `quota` health check
 * rather than guessing at one.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/api-token.ts";

import highlightCreate from "./actions/highlight-create.ts";
import highlightList from "./actions/highlight-list.ts";
import highlightGet from "./actions/highlight-get.ts";
import highlightUpdate from "./actions/highlight-update.ts";
import highlightDelete from "./actions/highlight-delete.ts";
import highlightExport from "./actions/highlight-export.ts";

import highlightTagList from "./actions/highlight-tag-list.ts";
import highlightTagGet from "./actions/highlight-tag-get.ts";
import highlightTagCreate from "./actions/highlight-tag-create.ts";
import highlightTagUpdate from "./actions/highlight-tag-update.ts";
import highlightTagDelete from "./actions/highlight-tag-delete.ts";

import bookList from "./actions/book-list.ts";
import bookGet from "./actions/book-get.ts";

import bookTagList from "./actions/book-tag-list.ts";
import bookTagGet from "./actions/book-tag-get.ts";
import bookTagCreate from "./actions/book-tag-create.ts";
import bookTagUpdate from "./actions/book-tag-update.ts";
import bookTagDelete from "./actions/book-tag-delete.ts";

import dailyReviewGet from "./actions/daily-review-get.ts";
import dailyReviewComplete from "./actions/daily-review-complete.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Highlights
    highlightCreate,
    highlightList,
    highlightGet,
    highlightUpdate,
    highlightDelete,
    highlightExport,
    // Highlight tags
    highlightTagList,
    highlightTagGet,
    highlightTagCreate,
    highlightTagUpdate,
    highlightTagDelete,
    // Books
    bookList,
    bookGet,
    // Book tags
    bookTagList,
    bookTagGet,
    bookTagCreate,
    bookTagUpdate,
    bookTagDelete,
    // Daily review
    dailyReviewGet,
    dailyReviewComplete,
  ],
  // A single access token. Readwise publishes no OAuth surface for third-party
  // apps — the token is the whole authentication story.
  auth: [accessToken],
  healthChecks: [service],
} satisfies AppDefinition;
