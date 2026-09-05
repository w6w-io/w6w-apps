/**
 * Donorbox — an online donation and fundraising platform built for
 * nonprofits: campaigns, donations, recurring plans, donors, ticketed
 * events, tickets and purchases, over the Donorbox API v1
 * (`donorbox.org/api/v1`).
 *
 * Every path, filter, and field in this app was verified on 2026-09-05
 * against Donorbox's own reference
 * (`https://raw.githubusercontent.com/donorbox/donorbox-api/master/README.md`,
 * ~17KB, hosted on the vendor's own GitHub org `donorbox/donorbox-api`) plus
 * live unauthenticated/garbage-credential probes against `donorbox.org`.
 * That repository holds no OpenAPI or Postman file alongside the README —
 * checked via the GitHub Contents API, which lists only the README and three
 * preview images.
 *
 * The findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The API is read-only.** All seven documented endpoints are `GET`;
 *     no create/update/delete verb appears anywhere in the reference. Every
 *     action here is a `search` (list) action.
 *  2. **HTTP Basic, with the account's login email as the username**
 *     (`auth/basic.ts`) — not an API-key header. Access to the API costs
 *     $17/month, billed separately from the Donorbox platform plan.
 *  3. **Responses are bare arrays, not an envelope** (`lib/client.ts`). No
 *     `{"data": [...]}` wrapper and no response-carried pagination metadata
 *     — only the `page`/`per_page` a caller sent.
 *  4. **The error body is a flat string** (`lib/client.ts`) —
 *     `{"error":"Authentication failed"}`, not `{error: {message}}`.
 *  5. **Real, live, undocumented rate-limit headers** (`health/quota.ts`).
 *     The README never mentions a rate limit, but every response — even an
 *     unauthenticated 401 — carries `x-ratelimit-limit`/`-remaining`/
 *     `-reset`, and the remaining count decremented across different
 *     garbage credentials, consistent with an IP-scoped budget.
 *  6. **The campaigns id filter's prose disagrees with its own example**
 *     (`actions/campaign-list.ts`) — the prose names `campaign_id`; the
 *     worked example sends `id`. This app follows the example.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import campaignList from "./actions/campaign-list.ts";
import donationList from "./actions/donation-list.ts";
import planList from "./actions/plan-list.ts";
import donorList from "./actions/donor-list.ts";
import eventList from "./actions/event-list.ts";
import ticketList from "./actions/ticket-list.ts";
import purchaseList from "./actions/purchase-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    campaignList,
    donationList,
    planList,
    donorList,
    eventList,
    ticketList,
    purchaseList,
  ],
  // Basic auth only. Donorbox publishes no OAuth surface for third-party
  // integrations — the account's login email plus a paid API key is the
  // entire authentication story.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
