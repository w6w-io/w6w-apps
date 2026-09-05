/**
 * WebinarJam / EverWebinar — read webinars, register attendees, list
 * registrants and unsubscribe leads across both of the vendor's webinar
 * products over one shared account-wide API key.
 *
 * Every path, field and error shape here was verified 2026-09-05 against the
 * vendor's own Help Center "Developer API" collection (17 hand-written
 * articles, not an OpenAPI spec — `support.webinarjam.com/en/collections/
 * 19655423-developer-api`) plus live, unauthenticated probes against
 * `api.webinarjam.com`. See `lib/client.ts` for the full verification record.
 *
 * The four findings that shaped this app:
 *
 *  1. **One credential, two products, one path prefix apart.** WebinarJam and
 *     EverWebinar share a single API key ("Only one set of API keys is
 *     generated per account") and an identical five-endpoint surface at
 *     `/webinarjam/…` vs `/everwebinar/…` on the same host — confirmed
 *     field-for-field across both products' docs. Every action here takes a
 *     `product` selector rather than being duplicated into ten near-identical
 *     files.
 *  2. **Getting a key is not self-serve.** API access requires manually
 *     applying (paid plans only, ~2 business days for vendor approval) —
 *     there is no key to paste immediately after installing this app. See
 *     `auth/api-key.ts`.
 *  3. **The docs never show a failure body — live probing did.** Both a
 *     missing and an invalid `api_key` return `{"status":"error","errors":
 *     {"api_key": string | string[]}}`, confirmed live against both products,
 *     with no credential material in the response. See `lib/client.ts`.
 *  4. **The registrants list's own field table is wrong.** It describes a
 *     flat, all-integer object; the docs' own example (an image, not text) is
 *     a Laravel-style paginator with formatted-string fields and several
 *     entries the table never lists. `actions/registrant-list.ts` is modelled
 *     on the actual example, not the table.
 *
 * Deliberately left out, because it could not be verified:
 *  - **"Get a list of countries and states/provinces."** Its own docs give
 *    two different, mutually inconsistent URLs — an undocumented `/api/`
 *    path segment in the prose, and a non-production `webinarjamdev.com` host
 *    in its own curl example. Neither matches the confirmed production host.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import webinarList from "./actions/webinar-list.ts";
import webinarGet from "./actions/webinar-get.ts";
import registrantCreate from "./actions/registrant-create.ts";
import registrantList from "./actions/registrant-list.ts";
import leadUnsubscribe from "./actions/lead-unsubscribe.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    webinarList,
    webinarGet,
    registrantCreate,
    registrantList,
    leadUnsubscribe,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
