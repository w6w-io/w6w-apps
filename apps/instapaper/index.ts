/**
 * Instapaper — save, organize and read articles, over the "Full Developer
 * API" (`instapaper.com/developers`), Instapaper's older but still-live
 * REST surface.
 *
 * Verified against two archived snapshots of the docs seven months apart
 * (2026-01-30 and 2026-06-15 — the current page is a client-rendered SPA
 * shell, so the actual reference content was recovered from the Wayback
 * Machine's cache of `instapaper.com/api/full`, which 301s to the same
 * content today). Both snapshots are byte-identical apart from whitespace,
 * confirming the surface is settled rather than mid-migration.
 *
 * Three findings that shaped this app:
 *
 *  1. **Auth is xAuth, not a bearer token or classic three-legged OAuth.**
 *     A username/password is exchanged once, at connect time, for an OAuth
 *     1.0a access token — signed with an app-level consumer key/secret
 *     Instapaper issues after a manual review. Every request after that is
 *     signed with full OAuth 1.0a (HMAC-SHA1); see `auth/xauth.ts` and
 *     `lib/oauth1.ts`.
 *  2. **Three response shapes coexist.** Most methods answer a tagged JSON
 *     array (`[{"type": "bookmark", ...}]`); `bookmarks/list` answers a
 *     bespoke object; `bookmarks/get_text` answers raw HTML with a bare 200.
 *     See `lib/client.ts`.
 *  3. **Instapaper publishes no status page.** `status.instapaper.com`
 *     doesn't resolve and `instapaper.statuspage.io` is an unclaimed decoy
 *     — see `health/service.ts` for the declared absence.
 *
 * Not implemented: the "Simple API" (a separate, one-way bookmarking surface
 * the docs point to as an alternative for apps that only need to add URLs —
 * out of scope here since the Full API already covers adding, and more).
 */
import type { AppDefinition } from "@w6w/types";
import xAuth from "./auth/xauth.ts";

import accountVerifyCredentials from "./actions/account-verify-credentials.ts";

import bookmarksList from "./actions/bookmarks-list.ts";
import bookmarksUpdateReadProgress from "./actions/bookmarks-update-read-progress.ts";
import bookmarksAdd from "./actions/bookmarks-add.ts";
import bookmarksDelete from "./actions/bookmarks-delete.ts";
import bookmarksStar from "./actions/bookmarks-star.ts";
import bookmarksUnstar from "./actions/bookmarks-unstar.ts";
import bookmarksArchive from "./actions/bookmarks-archive.ts";
import bookmarksUnarchive from "./actions/bookmarks-unarchive.ts";
import bookmarksMove from "./actions/bookmarks-move.ts";
import bookmarksGetText from "./actions/bookmarks-get-text.ts";

import foldersList from "./actions/folders-list.ts";
import foldersAdd from "./actions/folders-add.ts";
import foldersDelete from "./actions/folders-delete.ts";
import foldersSetOrder from "./actions/folders-set-order.ts";

import highlightsList from "./actions/highlights-list.ts";
import highlightsCreate from "./actions/highlights-create.ts";
import highlightsDelete from "./actions/highlights-delete.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Account
    accountVerifyCredentials,
    // Bookmarks
    bookmarksList,
    bookmarksUpdateReadProgress,
    bookmarksAdd,
    bookmarksDelete,
    bookmarksStar,
    bookmarksUnstar,
    bookmarksArchive,
    bookmarksUnarchive,
    bookmarksMove,
    bookmarksGetText,
    // Folders
    foldersList,
    foldersAdd,
    foldersDelete,
    foldersSetOrder,
    // Highlights
    highlightsList,
    highlightsCreate,
    highlightsDelete,
  ],
  auth: [xAuth],
  healthChecks: [service],
} satisfies AppDefinition;
