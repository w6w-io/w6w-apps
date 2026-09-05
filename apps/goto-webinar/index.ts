/**
 * GoTo Webinar — schedule and manage webinars, registrants, panelists and attendance over the
 * GoTo Webinar REST API v2 (`api.getgo.com/G2W/rest/v2`).
 *
 * Every path, verb, query parameter and body field in this app was verified 2026-09-05 against
 * the vendor's own `GoTo Webinar 2.0 REST API` Postman collection — embedded as
 * `openApi.postman.collection` in the page-data GraphQL response Gatsby serves for
 * `https://developer.goto.com/GoToWebinarV2/` (a live developer portal, not a third-party
 * integration directory) — plus live, unauthenticated probes against `api.getgo.com` and
 * `authentication.logmeininc.com` confirming both hosts answer with real, vendor-shaped
 * errors rather than a generic SPA 200.
 *
 * The three findings that shaped this app, each documented in full where it matters:
 *
 *  1. **Three hosts, one allowlist entry.** The product API and GoTo's Identity/whoami API
 *     (`/identity/v1/Users/me`) share one host, `api.getgo.com` — but OAuth itself lives on a
 *     THIRD, unrelated-looking host, `authentication.logmeininc.com` (GoTo's former parent
 *     company name, still live). `network.allow` therefore lists only `api.getgo.com`; the
 *     OAuth host is allowed implicitly via the `oauth2` block. See `lib/client.ts`.
 *  2. **Pagination is not uniform.** Every list is offset-paged with a zero-indexed `page`,
 *     but the page-SIZE parameter is spelled `size` on webinars/sessions/attendees and `limit`
 *     on registrants — and listing webinars additionally REQUIRES a `fromTime`/`toTime` date
 *     range; there is no unbounded list. See `lib/client.ts` and `actions/webinar-list.ts`.
 *  3. **No product-specific OAuth scope is documented**, and the identity whoami answers an
 *     EMPTY body (not JSON) on an invalid/missing token — the auth `test` hook must fall back
 *     to the `WWW-Authenticate` challenge header to classify the failure. See `auth/oauth2.ts`.
 *
 * Deliberately left out, because the vendor's documentation for it could not be verified live:
 *  - **`sequence`-type webinar creation** (a `recurrenceStart`/`recurrencePattern`/
 *    `recurrenceEnd` shape distinct from the plain `times` array `single_session`/`series`
 *    use) — its exact field names were not exercised against a live account.
 *  - **A `quota` health check.** No live response from `api.getgo.com` carried an
 *    `X-RateLimit-*`-shaped header (checked directly), and the vendor's own rate-limit
 *    reference page documents only a flat "10 requests/second, default" ceiling with no
 *    per-request remaining-count header to read — so there is nothing to report headroom
 *    from. Declaring one anyway would be fabricated numbers.
 *  - **Webhooks, user subscriptions, co-organizers, audio settings, `insessionWebinars`, the
 *    account-wide (`/accounts/{accountKey}/webinars`) list, and recording assets** — all real,
 *    documented endpoints in the same collection, left out to keep this first pass to the
 *    everyday webinar/registrant/panelist/attendance lifecycle; nothing here contradicts
 *    adding them later against the same verified base URL.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import webinarCreate from "./actions/webinar-create.ts";
import webinarList from "./actions/webinar-list.ts";
import webinarGet from "./actions/webinar-get.ts";
import webinarUpdate from "./actions/webinar-update.ts";
import webinarCancel from "./actions/webinar-cancel.ts";

import registrantCreate from "./actions/registrant-create.ts";
import registrantList from "./actions/registrant-list.ts";
import registrantGet from "./actions/registrant-get.ts";
import registrantDelete from "./actions/registrant-delete.ts";

import sessionList from "./actions/session-list.ts";
import attendeeList from "./actions/attendee-list.ts";

import panelistCreate from "./actions/panelist-create.ts";
import panelistList from "./actions/panelist-list.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // webinar
    webinarCreate,
    webinarList,
    webinarGet,
    webinarUpdate,
    webinarCancel,
    // registrant
    registrantCreate,
    registrantList,
    registrantGet,
    registrantDelete,
    // session / attendance
    sessionList,
    attendeeList,
    // panelist
    panelistCreate,
    panelistList,
  ],
  auth: [oauth2],
  healthChecks: [service],
} satisfies AppDefinition;
