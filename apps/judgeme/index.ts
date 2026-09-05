/**
 * Judge.me — ecommerce product-review collection, moderation and display, over
 * the Judge.me REST API v1 (`api.judge.me`).
 *
 * Every path, verb, parameter and schema in this app was verified on
 * 2026-09-05 against Judge.me's own machine-readable OpenAPI 3.0 document,
 * fetched directly from `https://judge.me/api/docs.yaml` (67,965 bytes,
 * `application/x-yaml`) — the Redoc page at `https://judge.me/api/docs` is
 * only a viewer for that same file. Nothing here came from a third-party
 * integration directory.
 *
 * The findings that shaped scope and design, each documented in full where it
 * matters:
 *
 *  1. **The base host is `api.judge.me`, not `judge.me`.** The document's
 *     `servers` block names exactly one server, `https://api.judge.me/api/v1`.
 *     `judge.me` only serves the docs page itself.
 *  2. **Two credential shapes exist; this app implements one.** API keys go
 *     in `X-Api-Token` + a required `shop_domain` query parameter; OAuth2
 *     access tokens go in `Authorization: Bearer`. The document names an
 *     authorize URL but publishes no token endpoint anywhere, so OAuth2 is
 *     left unimplemented rather than guessed. See `auth/api-key.ts`.
 *  3. **One error message covers two different mistakes.** A wrong API key,
 *     a wrong shop domain, or both, all produce the identical body
 *     `{"error": "Failed to authenticate. Shop domain or Api Token is
 *     wrong"}` — confirmed live. There is no way to tell which field is at
 *     fault from the response alone.
 *  4. **No rate-limit signal exists anywhere** — not in the document, not on
 *     the wire (checked live). `health/quota.ts` declares this explicitly.
 *  5. **The document itself contains real authoring errors**, not artifacts
 *     of this app's reading of it: the review-update path is keyed
 *     `'reviews/{id}':` with no leading slash (`actions/update-review.ts`);
 *     `GET /shops/info`'s only response evidence is an example attached to a
 *     `requestBody` on a operation that has none (`actions/get-shop-info.ts`);
 *     `PUT /shops`'s declared request schema is `{type: "string"}} while its
 *     own example is a full object (`actions/update-shop.ts`); and several
 *     operations (`reviews/count`, `reviews#create`, `reviewers#data_request`)
 *     document no response schema at all. Each is called out at its action.
 *
 * ## Scope
 *
 * Covers reviews (list/get/count/create/update), reviewers (get/upsert/data
 * request), replies (public and private), shop info/update, settings, and
 * webhooks — every path the document genuinely declares under those
 * resources. Two documented resource areas are deliberately left out:
 *
 *  - **Widgets** (`/widgets/*`) — thirteen endpoints that render sanitized
 *    HTML fragments for embedding directly into a storefront page. They are
 *    a display concern for a theme/frontend, not an operation a workflow
 *    orchestrates, so none are wrapped as actions here.
 *  - **Checkout Comments** (`POST /shops` `comments#create`) — gated to the
 *    "Checkout Comments app only" per the document's own description, a
 *    separate paid add-on this app has no way to verify access to.
 *
 * The document also carries parameter and schema definitions for `Order`,
 * `LineItem`, and `DeliveryTracking` resources (Review Request Email order
 * sync) with **no matching path anywhere in `paths:`** — orphaned
 * definitions for endpoints that are not part of this public document. No
 * actions were built against them, since there is no documented path to call.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listReviews from "./actions/list-reviews.ts";
import getReview from "./actions/get-review.ts";
import countReviews from "./actions/count-reviews.ts";
import createReview from "./actions/create-review.ts";
import updateReview from "./actions/update-review.ts";

import getReviewer from "./actions/get-reviewer.ts";
import updateReviewer from "./actions/update-reviewer.ts";
import requestReviewerData from "./actions/request-reviewer-data.ts";

import getShopInfo from "./actions/get-shop-info.ts";
import updateShop from "./actions/update-shop.ts";

import listSettings from "./actions/list-settings.ts";

import createReply from "./actions/create-reply.ts";
import createPrivateReply from "./actions/create-private-reply.ts";

import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Reviews
    listReviews,
    getReview,
    countReviews,
    createReview,
    updateReview,
    // Reviewers
    getReviewer,
    updateReviewer,
    requestReviewerData,
    // Shop
    getShopInfo,
    updateShop,
    // Settings
    listSettings,
    // Replies
    createReply,
    createPrivateReply,
    // Webhooks
    listWebhooks,
    createWebhook,
    deleteWebhook,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
