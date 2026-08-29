/**
 * Pushbullet — cross-device push notifications, links, files and SMS, over the
 * Pushbullet API v2 (`api.pushbullet.com`).
 *
 * Every path, verb, field and error shape in this app was verified on
 * 2026-08-29 against Pushbullet's own published API reference
 * (`docs.pushbullet.com`, fetched live, 414,076 bytes). Nothing here came from
 * a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The auth header is bespoke: `Access-Token`, never `Authorization:
 *     Bearer`** (`auth/access-token.ts`). Confirmed verbatim in the vendor's
 *     own quick-start example.
 *  2. **`delete-device`'s "Call" line contradicts its own worked example** —
 *     stated as `DELETE .../v2/devices` (no id) but demonstrated as
 *     `DELETE .../v2/devices/{iden}`. This app follows the concrete example,
 *     consistent with every other single-resource delete on the same page.
 *     See `actions/text-delete.ts` for the opposite case: `delete-text` is
 *     documented, self-consistently, as a `POST` rather than a `DELETE` — and
 *     is implemented exactly as written rather than "corrected" to match its
 *     siblings.
 *  3. **Request-rate headroom is genuinely readable** — `X-Ratelimit-Limit`,
 *     `-Remaining` and `-Reset` on every response (`health/rate-limit.ts`) —
 *     while the separate, vendor-stated 500-pushes/month free-tier ceiling has
 *     no readable counterpart anywhere in the API (`health/push-limit.ts`).
 *
 * Two documented endpoints are deliberately not implemented:
 *
 *  - **List Contacts** — removed from the API in 2015 ("replaced with the
 *    `Chat` objects" per the vendor's own changelog); `chat-list.ts` etc. are
 *    the modern surface.
 *  - **The ephemeral-based "Send SMS"** guide (an older, lower-level way to
 *    queue a text via `POST /v2/ephemerals`) — superseded by the `Text`
 *    object API this app implements (`create-text` etc.), which the vendor's
 *    own docs point to explicitly ("To send a text message, use
 *    create-text"). The rest of the Ephemerals surface (clipboard sync,
 *    notification mirroring/dismissal) is a consumer-app feature requiring
 *    client-side end-to-end encryption this app does not implement, and is
 *    left out rather than shipped half-working.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import pushList from "./actions/push-list.ts";
import pushCreate from "./actions/push-create.ts";
import pushUpdate from "./actions/push-update.ts";
import pushDelete from "./actions/push-delete.ts";
import pushDeleteAll from "./actions/push-delete-all.ts";

import deviceList from "./actions/device-list.ts";
import deviceCreate from "./actions/device-create.ts";
import deviceUpdate from "./actions/device-update.ts";
import deviceDelete from "./actions/device-delete.ts";

import chatList from "./actions/chat-list.ts";
import chatCreate from "./actions/chat-create.ts";
import chatUpdate from "./actions/chat-update.ts";
import chatDelete from "./actions/chat-delete.ts";

import channelCreate from "./actions/channel-create.ts";
import channelInfoGet from "./actions/channel-info-get.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import subscriptionDelete from "./actions/subscription-delete.ts";

import textCreate from "./actions/text-create.ts";
import textUpdate from "./actions/text-update.ts";
import textDelete from "./actions/text-delete.ts";

import userGet from "./actions/user-get.ts";
import uploadRequest from "./actions/upload-request.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";
import pushLimit from "./health/push-limit.ts";

export default {
  actions: [
    // Pushes
    pushList,
    pushCreate,
    pushUpdate,
    pushDelete,
    pushDeleteAll,
    // Devices
    deviceList,
    deviceCreate,
    deviceUpdate,
    deviceDelete,
    // Chats
    chatList,
    chatCreate,
    chatUpdate,
    chatDelete,
    // Channels
    channelCreate,
    channelInfoGet,
    // Subscriptions
    subscriptionList,
    subscriptionCreate,
    subscriptionUpdate,
    subscriptionDelete,
    // Texts (SMS/MMS)
    textCreate,
    textUpdate,
    textDelete,
    // Account
    userGet,
    // Upload
    uploadRequest,
  ],
  // Access Token only. Pushbullet's OAuth2 flow (see auth/access-token.ts) also
  // resolves to the same unscoped access-token wire format, so a second auth
  // method would add no capability — only a second way to obtain the same
  // credential, which is a Connection-setup concern rather than a wire-format one.
  auth: [accessToken],
  healthChecks: [service, rateLimit, pushLimit],
} satisfies AppDefinition;
