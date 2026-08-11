/**
 * TidyCal — the scheduling tool: read and cancel bookings, publish booking
 * types, find bookable timeslots, book them, and manage teams, over the TidyCal
 * REST API (`https://tidycal.com/api`).
 *
 * Every path, verb, parameter, body field and enum in this app was verified on
 * 2026-08-11 against TidyCal's **own OpenAPI 3.0.0 document** — extracted from
 * the `__redoc_state` blob inside `tidycal.com/developer/docs/` (1,351,149
 * bytes, md5 `7c21f07a20e52c573787fa403baf7f97`), which is a Redoc bundle rather
 * than hand-written prose — plus live unauthenticated probes of `tidycal.com`.
 * Nothing came from a third-party integration directory.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The document mislabels its own query parameters** (`lib/params.ts`).
 *     `GET /bookings` declares `starts_at`, `ends_at`, `cancelled`, `page` and
 *     `include_teams` as `"in": "path"` — for a path template that contains no
 *     placeholders. They are query parameters, and the same filters on
 *     `GET /teams/{team}/bookings` are declared `"in": "query"` four operations
 *     later in the same file.
 *  2. **The same filters are renamed between two endpoints** (`lib/params.ts`).
 *     Personal bookings filter on `starts_at`/`ends_at`; team bookings filter on
 *     `start_date`/`end_date`. Laravel ignores a query parameter it was not
 *     asked about, so getting it wrong returns an unfiltered list rather than an
 *     error.
 *  3. **The response envelope is inconsistent** (`lib/client.ts`). Collections
 *     and creates answer `{"data": …}`; the four single-resource reads
 *     (`/bookings/{id}`, `/me`, `/teams/{id}`, and the cancel response) answer
 *     the bare entity; the two team-membership writes answer `{"message", …}`.
 *     A client that unwraps `data` unconditionally returns `undefined` for the
 *     whoami, so this one unwraps nothing.
 *  4. **The API shares an origin with the marketing site** (`lib/client.ts`,
 *     `health/api.ts`). The host is `tidycal.com` — `api.tidycal.com` is
 *     NXDOMAIN — and an unknown `/api/<x>` path falls through to the site's
 *     vanity-URL route, answering `404 {"message":"No query results for model
 *     [App\\Models\\User] api"}`. A typo'd endpoint reports a missing *user*.
 *  5. **`GET /api/me` is safe as the probe, and it was checked rather than
 *     assumed** (`auth/personal-token.ts`). Its `User` schema has seven
 *     properties and none of them is a credential — unlike Mailjet's `/apikey`
 *     or Follow Up Boss's `/me`, which return the caller's own key. Every
 *     alternative here is a collection carrying either a payment-platform UUID
 *     or third parties' emails, phone numbers and IP addresses.
 *
 * One more thing the route map turned up: `GET /api/booking-types/{id}` and
 * `GET /api/contacts/1` do **not** exist (404 "route could not be found"), so
 * the two list actions are the only way to obtain those IDs; and
 * `GET /api/booking-types/{id}/bookings` *does* exist on the wire but is
 * undocumented, so this app does not call it. See `README.md`.
 */
import type { AppDefinition } from "@w6w/types";

import personalToken from "./auth/personal-token.ts";
import oauth2 from "./auth/oauth2.ts";

import bookingList from "./actions/booking-list.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingCancel from "./actions/booking-cancel.ts";

import bookingTypeList from "./actions/booking-type-list.ts";
import bookingTypeCreate from "./actions/booking-type-create.ts";
import timeslotList from "./actions/timeslot-list.ts";
import bookingCreate from "./actions/booking-create.ts";

import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";

import accountGet from "./actions/account-get.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamBookingList from "./actions/team-booking-list.ts";
import teamUserList from "./actions/team-user-list.ts";
import teamUserAdd from "./actions/team-user-add.ts";
import teamUserRemove from "./actions/team-user-remove.ts";
import teamBookingTypeList from "./actions/team-booking-type-list.ts";
import teamBookingTypeCreate from "./actions/team-booking-type-create.ts";

import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Bookings
    bookingList,
    bookingGet,
    bookingCancel,
    // Booking types & booking
    bookingTypeList,
    bookingTypeCreate,
    timeslotList,
    bookingCreate,
    // Contacts
    contactList,
    contactCreate,
    // Account
    accountGet,
    // Teams
    teamList,
    teamGet,
    teamBookingList,
    teamUserList,
    teamUserAdd,
    teamUserRemove,
    teamBookingTypeList,
    teamBookingTypeCreate,
  ],
  // Both methods TidyCal documents, and no more. A personal access token for
  // your own account; an OAuth 2.0 authorization-code client for connecting
  // other people's. Both were confirmed live on 2026-08-11.
  auth: [personalToken, oauth2],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
