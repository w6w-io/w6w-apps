/**
 * respond.io — the business-messaging CRM: unify WhatsApp, SMS, Messenger,
 * Instagram, email and more into one contact-and-conversation inbox, over the
 * respond.io Developer API v2 (`api.respond.io`).
 *
 * Every path, verb, request/response field and error shape in this app was
 * verified against respond.io's own official GitHub organization
 * (`github.com/respond-io`, confirmed via `gh api orgs/respond-io`:
 * `blog: https://respond.io`, operating since 2017) — specifically its
 * published `@respond-io/typescript-sdk` and its own `respond-io/mcp-server`
 * — plus live probes against `api.respond.io` and `status.respond.io` on
 * 2026-09-05. respond.io's public docs site (`developers.respond.io`) is a
 * Stoplight-hosted single-page app with no reachable machine-readable spec
 * (every `openapi.json`/`.yaml`-shaped path 404s), so it was not usable as a
 * source; see `lib/client.ts` for the full provenance note.
 *
 * The three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **A CloudFront edge rule, not a respond.io one, gates auth shape**
 *     (`auth/api-token.ts`). Any request whose `Authorization` header is
 *     missing or not shaped `Bearer <anything>` never reaches respond.io's
 *     own code — it gets an opaque CloudFront HTML block page. Only a
 *     `Bearer`-shaped header (even an empty or garbage one) reaches the real
 *     API and gets its structured `{code, status, message}` JSON error.
 *  2. **No `/whoami` or `/me` endpoint exists** in the documented v2 surface
 *     (confirmed against every method of the official SDK's five clients).
 *     The credential probe is `GET /space/user?limit=1` — the same
 *     workspace-scoped read respond.io's own `mcp-server` uses as its client
 *     health check.
 *  3. **`status.respond.io` is a real, self-identifying status page that
 *     renders entirely client-side** (`health/service.ts`) — every
 *     Statuspage/RSS/Atom-shaped path answers an identical HTML shell, so no
 *     feed is reachable without executing its JS. Declared `unavailable`
 *     rather than wired to a page that would silently always read "ok".
 *
 * One further gap, left out rather than guessed at: the official SDK's
 * `SpaceClient` has `createTag`/`updateTag`/`deleteTag` but **no `listTags`**
 * — there is no documented way to enumerate a workspace's tags, only to
 * create, rename, or delete one by name.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactCreateOrUpdate from "./actions/contact-create-or-update.ts";
import contactMerge from "./actions/contact-merge.ts";
import contactList from "./actions/contact-list.ts";
import contactAddTags from "./actions/contact-add-tags.ts";
import contactRemoveTags from "./actions/contact-remove-tags.ts";
import contactListChannels from "./actions/contact-list-channels.ts";
import contactUpdateLifecycle from "./actions/contact-update-lifecycle.ts";

import conversationAssign from "./actions/conversation-assign.ts";
import conversationUpdateStatus from "./actions/conversation-update-status.ts";

import messageSend from "./actions/message-send.ts";
import messageGet from "./actions/message-get.ts";
import messageList from "./actions/message-list.ts";

import commentCreate from "./actions/comment-create.ts";

import spaceUserList from "./actions/space-user-list.ts";
import spaceUserGet from "./actions/space-user-get.ts";
import spaceCustomFieldCreate from "./actions/space-custom-field-create.ts";
import spaceCustomFieldList from "./actions/space-custom-field-list.ts";
import spaceCustomFieldGet from "./actions/space-custom-field-get.ts";
import spaceClosingNoteList from "./actions/space-closing-note-list.ts";
import spaceChannelList from "./actions/space-channel-list.ts";
import spaceChannelTemplateList from "./actions/space-channel-template-list.ts";
import spaceTagCreate from "./actions/space-tag-create.ts";
import spaceTagUpdate from "./actions/space-tag-update.ts";
import spaceTagDelete from "./actions/space-tag-delete.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Contact
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactCreateOrUpdate,
    contactMerge,
    contactList,
    contactAddTags,
    contactRemoveTags,
    contactListChannels,
    contactUpdateLifecycle,
    // Conversation
    conversationAssign,
    conversationUpdateStatus,
    // Messaging
    messageSend,
    messageGet,
    messageList,
    // Comment
    commentCreate,
    // Space (workspace)
    spaceUserList,
    spaceUserGet,
    spaceCustomFieldCreate,
    spaceCustomFieldList,
    spaceCustomFieldGet,
    spaceClosingNoteList,
    spaceChannelList,
    spaceChannelTemplateList,
    spaceTagCreate,
    spaceTagUpdate,
    spaceTagDelete,
  ],
  // API access token only. respond.io publishes no OAuth surface for
  // third-party apps in the official SDK or MCP server; a personal access
  // token minted per-workspace is the whole authentication story.
  auth: [apiToken],
  healthChecks: [service],
} satisfies AppDefinition;
