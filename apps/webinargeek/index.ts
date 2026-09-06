/**
 * WebinarGeek — manage webinars, broadcasts (the actual scheduled/on-demand sessions), and
 * subscribers over WebinarGeek's own REST API v2 (`app.webinargeek.com/api/v2`).
 *
 * Every path, verb, query parameter and body field in this app was verified 2026-09-06 against
 * the vendor's own API Blueprint — fetched directly from `https://jsapi.apiary.io/apis/
 * webinargeek.apib`, the raw source behind the rendered `webinargeek.docs.apiary.io` page that
 * `https://www.webinargeek.com/api/` redirects to — plus live, unauthenticated and bogus-token
 * probes against `app.webinargeek.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The three findings that shaped this app, each documented in full where it matters:
 *
 *  1. **A single API-key header, no OAuth, one host.** Every request is authenticated with an
 *     `Api-Token` header (not `Authorization`), and every documented endpoint hangs off
 *     `app.webinargeek.com/api/v2` — so `network.allow` needs exactly one hostname. See
 *     `auth/api-key.ts`.
 *  2. **The auth failure body cannot tell "missing" from "wrong" apart.** A live probe with no
 *     `Api-Token` header and one with a syntactically valid but incorrect key both answer the
 *     identical `401 {"code":"unauthorized","message":"Key is not provided or does not exists"}`
 *     — `test` classifies by the vendor's own `code` field and says so rather than guessing a
 *     more specific cause. See `auth/api-key.ts`.
 *  3. **Two date formats coexist.** Almost every timestamp is a Unix epoch integer, but the
 *     `subscription-list` action's `watchEndFrom`/`watchEndTo` filters and `broadcast-create`'s
 *     `date` are both ISO-8601 strings — the latter with a UTC offset. See `lib/client.ts` and
 *     `actions/broadcast-create.ts`.
 *
 * Two actions are genuinely idempotent by the vendor's own stated behavior, not just assumed
 * safe to retry: `webinar-series-subscribe` silently skips a subscriber already subscribed to a
 * broadcast in the series, and `broadcast-create` returns the existing broadcast when the date
 * given matches one already scheduled for that episode. `broadcast-subscribe` (subscribing to
 * ONE broadcast directly) documents no such behavior, so it is marked non-idempotent.
 *
 * Deliberately left out, because the v2 API documents no endpoint for it:
 *  - **Creating, updating or deleting webinars, episodes, team members or departments** — the
 *    v2 API is read/subscribe-oriented for these; only broadcasts can be created (for an
 *    existing episode) and subscribers subscribed/unsubscribed.
 *  - **The deprecated v1 API** — the spec itself says not to use it anymore.
 *  - **Webhooks** — not documented anywhere in this API Blueprint.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import webinarList from "./actions/webinar-list.ts";
import webinarGet from "./actions/webinar-get.ts";
import webinarSeriesSubscribe from "./actions/webinar-series-subscribe.ts";

import broadcastList from "./actions/broadcast-list.ts";
import broadcastGet from "./actions/broadcast-get.ts";
import broadcastSubscribe from "./actions/broadcast-subscribe.ts";
import broadcastCreate from "./actions/broadcast-create.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionUnsubscribe from "./actions/subscription-unsubscribe.ts";

import subscriptionPaymentList from "./actions/subscription-payment-list.ts";
import messageList from "./actions/message-list.ts";
import questionList from "./actions/question-list.ts";

import accountGet from "./actions/account-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // webinar
    webinarList,
    webinarGet,
    webinarSeriesSubscribe,
    // broadcast
    broadcastList,
    broadcastGet,
    broadcastSubscribe,
    broadcastCreate,
    // subscription
    subscriptionList,
    subscriptionGet,
    subscriptionUnsubscribe,
    // subscription payments / messages / questions
    subscriptionPaymentList,
    messageList,
    questionList,
    // account
    accountGet,
  ],
  // API key only. WebinarGeek publishes no OAuth surface — a single account-wide key is the
  // whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
