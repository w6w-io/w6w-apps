/**
 * Trustpilot — the customer-review platform, organised around the **Business Unit**: the
 * profile that hosts one website's ratings, reviews and responses.
 *
 * Everything in this app was verified on 2026-09-01 against Trustpilot's own developer
 * documentation (`developers.trustpilot.com` — Authentication overview, the four OAuth
 * grant-type pages, Business Units API, Product Reviews API, Invitations API, Rate
 * limiting best practices, Common error messages) plus a live fetch of
 * `status.trustpilot.com`. Nothing here came from a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Two hosts, not one.** `api.trustpilot.com` serves Business Units and Product
 *     Reviews; `invitations-api.trustpilot.com` serves Invitations, exclusively. Mixing
 *     them up is the single most common way a Trustpilot integration breaks — see
 *     `lib/client.ts`.
 *  2. **Two authentication stories, not one.** Public endpoints (most of Business Units
 *     and Product Reviews) take a bare `apikey` header and nothing else. Private
 *     endpoints (all of Invitations) need an OAuth 2.0 access token. This app mints that
 *     token itself via the **client-credentials** grant — the one Trustpilot flow that
 *     needs no browser and no end-user login — so it stays usable from an unattended
 *     workflow. See `auth/api-key.ts` and `auth/client-credentials.ts`.
 *  3. **A `businessUnitId` belongs to the request, not the Connection.** One API key can
 *     reach more than one Business Unit, so every action that needs one takes it as a
 *     param rather than storing it on the credential.
 *
 * Reviews at rest are covered two ways: `business-unit-reviews-list` (page/perPage,
 * filterable) for a targeted read, and `business-unit-reviews-list-all` (cursor
 * `pageToken`) for scraping every review Trustpilot's own docs name as the page-safe form.
 *
 * ## Deliberately not covered
 *
 * - **`GET /v1/business-units/find`** — Trustpilot names this as *the* way to look up a
 *   Business Unit's id from a domain, but its reference page shows the request only, no
 *   response schema. `business-unit-search` (which does document its response) covers the
 *   same practical need.
 * - **Private business-unit reviews, product-review conversations, Service Reviews API,
 *   Consumer API, Categories API, Business Signup API, Data Solutions API, Deletions
 *   API** — out of scope for this pass; the two modules above cover the
 *   read-a-business's-reputation-and-invite-reviews path this app is built around.
 * - **The Invitations API's `invitation-links` and `invitation-data/delete` endpoints** —
 *   left out for scope; `invitation-send-email` and `invitation-list-templates` cover the
 *   send-an-invitation path.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import clientCredentials from "./auth/client-credentials.ts";

import businessUnitGetProfile from "./actions/business-unit-get-profile.ts";
import businessUnitSearch from "./actions/business-unit-search.ts";
import businessUnitListCategories from "./actions/business-unit-list-categories.ts";
import businessUnitGetWebLinks from "./actions/business-unit-get-web-links.ts";
import businessUnitReviewsList from "./actions/business-unit-reviews-list.ts";
import businessUnitReviewsListAll from "./actions/business-unit-reviews-list-all.ts";

import productReviewGetSummary from "./actions/product-review-get-summary.ts";
import productReviewBatchSummaries from "./actions/product-review-batch-summaries.ts";
import productReviewList from "./actions/product-review-list.ts";

import invitationListTemplates from "./actions/invitation-list-templates.ts";
import invitationSendEmail from "./actions/invitation-send-email.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Business Units
    businessUnitGetProfile,
    businessUnitSearch,
    businessUnitListCategories,
    businessUnitGetWebLinks,
    businessUnitReviewsList,
    businessUnitReviewsListAll,
    // Product Reviews
    productReviewGetSummary,
    productReviewBatchSummaries,
    productReviewList,
    // Invitations
    invitationListTemplates,
    invitationSendEmail,
  ],
  // Two methods for two authentication stories — see the module doc above. Use `api-key`
  // for Business Units / Product Reviews actions and `client-credentials` for Invitations.
  auth: [apiKey, clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
