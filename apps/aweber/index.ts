/**
 * AWeber — email newsletters: Lists, Subscribers, and Broadcasts, over the
 * AWeber API v1 (`api.aweber.com/1.0`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-05 against AWeber's own OpenAPI 3.0.2 document —
 * served fully resolved as the embedded Redoc state on
 * `https://api.aweber.com/` itself (the page titled "AWeber API & Webhook
 * Documentation") — plus live probes against `api.aweber.com` and
 * `status.aweber.com`. Nothing here came from a third-party integration
 * directory. `https://developers.aweber.com/` — the URL most search engines
 * surface — 301-redirects to AWeber's marketing homepage, not the developer
 * portal; the real docs live at `api.aweber.com` itself.
 *
 * The five findings that shaped this app's design, each documented in full
 * where it matters:
 *
 *  1. **The API answers an OAuth *1.0a* error to an unsigned request**
 *     (`auth/oauth2.ts`). `GET /1.0/accounts` with no `Authorization` header
 *     answers `400 MissingOAuthParametersError` naming `oauth_consumer_key`,
 *     `oauth_nonce`, etc. — that is the fallback for a request with no
 *     recognizable scheme at all, not evidence the API still runs on OAuth
 *     1. The moment a bearer token is present the response switches to the
 *     OAuth 2.0 shape, and the spec's own security scheme is unambiguous.
 *     OAuth 1.0a (still accepted, per AWeber's own migration notice) is not
 *     implemented here.
 *  2. **Two unrelated error envelopes coexist** (`lib/client.ts`). A
 *     REST-layer failure answers `{"error": {"type", "message", ...}}`; a
 *     bearer-token failure answers the RFC 6750 shape instead —
 *     `{"error": "invalid_token", "error_description": "..."}`, a bare
 *     string, not an object.
 *  3. **A `PATCH` succeeds with the non-standard status `209`**, returning
 *     the updated entity; a `POST` (add a subscriber, create a custom
 *     field, move a subscriber) succeeds with `201` and **no body at all**
 *     — only a `Location` header. A third create endpoint, creating a
 *     broadcast, answers a plain `200` with the full body. Three different
 *     "how do I learn what I just created" conventions inside one API.
 *  4. **Three incompatible pagination/collection shapes** (`lib/client.ts`,
 *     `actions/broadcast-opens.ts`, `actions/tag-list.ts`): offset paging
 *     (`ws.start`/`ws.size`) wrapped in `{"entries": [...]}` for most
 *     collections, cursor paging (`before`/`after`/`page_size`) for
 *     broadcast opens/clicks, and a bare unwrapped array of strings for
 *     `GET .../tags` — no `entries`, no paging at all.
 *  5. **`GET .../broadcasts` requires a `status` filter** — there is no "all
 *     broadcasts" call — and `draft` only returns drafts this API itself
 *     created; a draft started in AWeber's own web UI never appears, and
 *     cannot be updated or deleted through this API either
 *     (`actions/broadcast-list.ts`, `actions/broadcast-update.ts`).
 *
 * Two request-body enums are documented as the literal strings `"true"` /
 * `"false"`, not JSON booleans (`update_existing`, `strict_custom_fields` on
 * Add Subscriber) — `actions/subscriber-add.ts` converts a real boolean
 * param rather than exposing that as user-facing surface.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";

import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listFind from "./actions/list-find.ts";

import tagList from "./actions/tag-list.ts";

import customFieldList from "./actions/custom-field-list.ts";
import customFieldGet from "./actions/custom-field-get.ts";
import customFieldCreate from "./actions/custom-field-create.ts";
import customFieldUpdate from "./actions/custom-field-update.ts";
import customFieldDelete from "./actions/custom-field-delete.ts";

import subscriberList from "./actions/subscriber-list.ts";
import subscriberGet from "./actions/subscriber-get.ts";
import subscriberAdd from "./actions/subscriber-add.ts";
import subscriberUpdate from "./actions/subscriber-update.ts";
import subscriberUpdateByEmail from "./actions/subscriber-update-by-email.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberDeleteByEmail from "./actions/subscriber-delete-by-email.ts";
import subscriberMove from "./actions/subscriber-move.ts";
import subscriberFind from "./actions/subscriber-find.ts";
import subscriberFindAcrossLists from "./actions/subscriber-find-across-lists.ts";
import subscriberGetActivity from "./actions/subscriber-get-activity.ts";

import purchaseCreate from "./actions/purchase-create.ts";

import broadcastList from "./actions/broadcast-list.ts";
import broadcastGet from "./actions/broadcast-get.ts";
import broadcastCreate from "./actions/broadcast-create.ts";
import broadcastUpdate from "./actions/broadcast-update.ts";
import broadcastDelete from "./actions/broadcast-delete.ts";
import broadcastCancel from "./actions/broadcast-cancel.ts";
import broadcastSchedule from "./actions/broadcast-schedule.ts";
import broadcastOpens from "./actions/broadcast-opens.ts";
import broadcastClicks from "./actions/broadcast-clicks.ts";

import segmentList from "./actions/segment-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Accounts
    accountList,
    accountGet,
    // Lists
    listList,
    listGet,
    listFind,
    // Tags
    tagList,
    // Custom fields
    customFieldList,
    customFieldGet,
    customFieldCreate,
    customFieldUpdate,
    customFieldDelete,
    // Subscribers
    subscriberList,
    subscriberGet,
    subscriberAdd,
    subscriberUpdate,
    subscriberUpdateByEmail,
    subscriberDelete,
    subscriberDeleteByEmail,
    subscriberMove,
    subscriberFind,
    subscriberFindAcrossLists,
    subscriberGetActivity,
    // Purchases
    purchaseCreate,
    // Broadcasts
    broadcastList,
    broadcastGet,
    broadcastCreate,
    broadcastUpdate,
    broadcastDelete,
    broadcastCancel,
    broadcastSchedule,
    broadcastOpens,
    broadcastClicks,
    // Segments
    segmentList,
  ],
  // OAuth 2.0 only. AWeber's older OAuth 1.0a is still accepted by the API
  // (see the module docs, finding 1) but is not implemented here — AWeber's
  // own guidance is to move off it.
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
