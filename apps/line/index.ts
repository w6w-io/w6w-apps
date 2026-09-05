/**
 * LINE — the Japan-popular chat platform's Messaging API: reply/push/multicast/broadcast messages,
 * bot and profile reads, rich menus, and media retrieval, over `api.line.me` and (for large-payload
 * endpoints only) `api-data.line.me`.
 *
 * Every path, header, and response field in this app was verified on 2026-09-05 against LINE's own
 * reference source (`github.com/line/line-developers-docs-source`,
 * `docs/en/reference/messaging-api/index.html.md`) plus live probes against `api.line.me` — the
 * rendered reference page at developers.line.biz renders its endpoint detail client-side, so the
 * markdown source it is built from was fetched directly rather than scraping the rendered HTML.
 *
 * Three findings that shaped this app, each documented in full where it matters:
 *
 *  1. **Two hosts, and the split is exact.** `api.line.me` for everything except five endpoints
 *     that move large binary payloads — this app touches two of those five (content retrieval, rich
 *     menu image upload), both on `api-data.line.me` (`lib/client.ts`).
 *  2. **The vendor's own status page is scoped wider than this API.** `api.line-status.info`
 *     genuinely covers a "Messaging API" group, but the same page also carries LINE Login, LIFF and
 *     the Developers Console/Site as separate top-level components — `health/service.ts` reports
 *     only the Messaging API group's own children, not the page's worst component.
 *  3. **LINE's own idempotency key needs a caller-minted UUID.** `X-Line-Retry-Key` on push,
 *     multicast and broadcast is real, but it has to be a UUID the *caller* generates and keeps
 *     stable across retries — the host's `ctx.invocation.invocationId` is not UUID-shaped, so this
 *     app leaves it an opt-in pass-through param (`lib/params.ts`'s `retryKeyParam`) instead of
 *     silently wiring one in and claiming `idempotent: true`.
 */
import type { AppDefinition } from "@w6w/types";
import channelAccessToken from "./auth/channel-access-token.ts";

import botInfoGet from "./actions/bot-info-get.ts";
import profileGet from "./actions/profile-get.ts";

import messageReply from "./actions/message-reply.ts";
import messagePush from "./actions/message-push.ts";
import messageMulticast from "./actions/message-multicast.ts";
import messageBroadcast from "./actions/message-broadcast.ts";
import messageQuotaGet from "./actions/message-quota-get.ts";
import messageQuotaConsumptionGet from "./actions/message-quota-consumption-get.ts";

import contentGet from "./actions/content-get.ts";

import richMenuCreate from "./actions/rich-menu-create.ts";
import richMenuList from "./actions/rich-menu-list.ts";
import richMenuGet from "./actions/rich-menu-get.ts";
import richMenuDelete from "./actions/rich-menu-delete.ts";
import richMenuImageUpload from "./actions/rich-menu-image-upload.ts";
import richMenuSetDefault from "./actions/rich-menu-set-default.ts";
import richMenuLinkToUser from "./actions/rich-menu-link-to-user.ts";
import richMenuUnlinkFromUser from "./actions/rich-menu-unlink-from-user.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Bot / profile
    botInfoGet,
    profileGet,
    // Messages
    messageReply,
    messagePush,
    messageMulticast,
    messageBroadcast,
    messageQuotaGet,
    messageQuotaConsumptionGet,
    // Content
    contentGet,
    // Rich menus
    richMenuCreate,
    richMenuList,
    richMenuGet,
    richMenuDelete,
    richMenuImageUpload,
    richMenuSetDefault,
    richMenuLinkToUser,
    richMenuUnlinkFromUser,
  ],
  // A channel access token is the whole authentication story here — see
  // `auth/channel-access-token.ts` for why this app supports only the long-lived form.
  auth: [channelAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
