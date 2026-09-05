/**
 * Zoho Calendar — calendars, events, search and free/busy, over the Zoho Calendar REST API
 * (`https://calendar.zoho.com/api/v1/...`, and its seven regional siblings).
 *
 * Every path, verb, query parameter and response shape in this app was verified live 2026-09-05
 * against Zoho's own documentation (`https://www.zoho.com/calendar/help/api/introduction.html`
 * plus the calendars-api, events-api, search-api, freebusy-api and response-codes pages it links
 * to) and live probes against all eight regional API hosts and their accounts hosts. Nothing here
 * came from a third-party integration directory or from this pack's other Zoho apps' assumptions —
 * each was independently re-verified for Calendar specifically.
 *
 * Scoped to **Zoho Calendar specifically** — this pack already ships `zoho` (Zoho CRM),
 * `zohobooks` and `zohodesk`, separate products with separate API surfaces; do not confuse them.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The API host is `calendar.zoho.<tld>`, not `www.zohoapis.<tld>`** (`lib/regions.ts`).
 *     Zoho Calendar's own docs name only `calendar.zoho.com` and never mention a second host — but
 *     Zoho hosts accounts across eight regional data centres, and a live probe of all eight
 *     `calendar.zoho.<tld>` hosts confirms every one is a real, distinct deployment. Calendar
 *     follows Zoho Mail's `<product>.zoho.<tld>` convention, not CRM/Books' shared
 *     `www.zohoapis.<tld>` — an easy mix-up if you carry the assumption over from this pack's other
 *     Zoho apps.
 *  2. **Canada breaks the naming pattern on BOTH the API host and the accounts host**
 *     (`lib/regions.ts`). `zohobooks`/`zohodesk` only need their *accounts* host corrected for
 *     Canada (`accounts.zohocloud.ca`, not `accounts.zoho.ca`); their API host still follows the
 *     plain `<tld>` pattern. Zoho Calendar's own API host does not: `calendar.zoho.ca` fails to
 *     resolve at all — the real host is `calendar.zohocloud.ca`.
 *  3. **Write payloads travel as a JSON-encoded QUERY PARAMETER (`calendarData=`/`eventdata=`), not
 *     a request body** (`lib/client.ts`). Every documented POST/PUT sample request encodes the
 *     whole payload this way. A JSON body posted instead is simply never read.
 *  4. **`PUT` (Update Event) REPLACES the whole event; it does not patch** (`lib/events.ts`).
 *     Zoho's own doc says so explicitly. Update Calendar, by contrast, is a genuine partial patch.
 *     Sending Update Event with only the field you meant to change clears everything else.
 *  5. **The error envelope is `{"error":[{...}]}`, an array — unlike CRM/Books' flat object**
 *     (`lib/client.ts`). `INVALID_TICKET` (no usable auth header reached the request) and
 *     `INVALID_OAUTHTOKEN` (a token reached it but was rejected) are two different problems,
 *     distinguished in `auth/oauth2.ts`'s `test` hook the same way `zohobooks`/`zohodesk`
 *     distinguish their own two error codes — but Calendar's shape is its own.
 *  6. **No quota surface exists** (`health/quota.ts`). No rate-limit header of any kind, on any
 *     response, and no mention in the vendor's own docs — declared absent rather than guessed.
 *  7. **`etag` is a real optimistic-concurrency precondition, not an incidental field**
 *     (`actions/event-update.ts`, `actions/event-delete.ts`). Both mutating event endpoints require
 *     the event's current `etag` (from Get Event) and reject a stale one.
 *
 * Deliberately absent: file attachments (`attach-file`/`delete-attachment` — multipart upload, out
 * of scope for this JSON-only action set), Move Event (a non-standard `MOVE` HTTP verb), and the
 * `conference` field on event create/update (needs the separate `ZohoMeeting.meeting.ALL` scope
 * this app does not request, to keep the OAuth consent screen to only what Calendar itself needs —
 * see `auth/oauth2.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import calendarList from "./actions/calendar-list.ts";
import calendarGet from "./actions/calendar-get.ts";
import calendarCreate from "./actions/calendar-create.ts";
import calendarUpdate from "./actions/calendar-update.ts";
import calendarDelete from "./actions/calendar-delete.ts";

import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventUpdate from "./actions/event-update.ts";
import eventDelete from "./actions/event-delete.ts";
import eventGroupAttendeesGet from "./actions/event-group-attendees-get.ts";
import eventSearch from "./actions/event-search.ts";

import freebusyGet from "./actions/freebusy-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // calendars
    calendarList,
    calendarGet,
    calendarCreate,
    calendarUpdate,
    calendarDelete,
    // events
    eventList,
    eventGet,
    eventCreate,
    eventUpdate,
    eventDelete,
    eventGroupAttendeesGet,
    eventSearch,
    // free/busy
    freebusyGet,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
