/**
 * Pushover — push notifications to phones, tablets and desktops, on the
 * **Pushover API** (`api.pushover.net/1/…`).
 *
 * Every endpoint, parameter and limit was verified on 2026-08-11 against
 * Pushover's own API documentation (`pushover.net/api`) plus live probes against
 * `api.pushover.net`. Nothing here came from a third-party integration
 * directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The credential is two values and neither is a header**
 *     (`auth/app-token.ts`). `token` and `user` are ordinary form fields, so
 *     `sign` rewrites the request **body** — and the query string on the two GET
 *     endpoints — rather than a header. The actions never see either value.
 *  2. **A 4xx must never be retried** (`lib/client.ts`). The vendor is explicit:
 *     "repeating your same request will not work, no matter how many times you
 *     retry it." A rejection is the caller's to fix; only a 5xx is worth another
 *     attempt, and no sooner than five seconds.
 *  3. **Emergency priority is a different contract**
 *     (`actions/message-send.ts`). `priority: 2` makes `retry` and `expire`
 *     required and returns a `receipt`; this app enforces the pair locally so
 *     the error names the missing parameter.
 *  4. **The quota is real and readable** (`health/quota.ts`) — messages per
 *     month per *account*, shared across its applications, exposed both as
 *     `X-Limit-App-*` headers and at `GET /1/apps/limits.json`. That makes
 *     `quota` a live probe here rather than a declared absence.
 *
 * The `service` check is the reverse: Pushover's status page is real but
 * publishes no feed, and the Atlassian-looking `pushover.statuspage.io` is an
 * unclaimed-subdomain trap. `health/service.ts` says so and declares itself
 * unavailable rather than parsing a marketing page.
 */
import type { AppDefinition } from "@w6w/types";
import appToken from "./auth/app-token.ts";

import messageSend from "./actions/message-send.ts";
import userValidate from "./actions/user-validate.ts";
import soundsList from "./actions/sounds-list.ts";
import limitsGet from "./actions/limits-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    messageSend,
    userValidate,
    soundsList,
    limitsGet,
  ],
  auth: [appToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
