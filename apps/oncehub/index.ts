/**
 * OnceHub — appointment scheduling and conversational booking, over its REST
 * API v2 (`api.oncehub.com/v2`).
 *
 * Every path, method, param and error shape here was verified on 2026-08-25
 * against OnceHub's own OpenAPI 3.1 document, served inline by their docs
 * site's Scalar reference at
 * `help.oncehub.com/developers/api/booking-calendars-api.yaml` (4,337 lines,
 * `info.version` 2.0.0), plus a live unauthenticated probe against
 * `api.oncehub.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that would have cost someone a day:
 *
 *  1. **The credential header is `API-Key`, not `Authorization: Bearer`**
 *     (`auth/api-key.ts`). Easy to assume Bearer by convention; OnceHub's own
 *     docs are explicit that it's a bare custom header with no prefix.
 *  2. **A deleted resource answers 200 in "redacted mode", not 404**
 *     (`actions/booking-calendar-get.ts`) — `GET` on a deleted booking
 *     calendar or contact returns `{ id, object, deleted: true }` with a
 *     normal 2xx. Code that treats "not 404" as "still exists" will be wrong.
 *  3. **No quota to read despite real, fixed rate limits**
 *     (`health/quota.ts`). OnceHub documents 5 req/s per account and 200
 *     req/5min per IP, but ships no `/usage` endpoint and no
 *     `X-RateLimit-*`/`RateLimit-*` response headers anywhere in the spec —
 *     headroom can only be inferred from observed 429s.
 *
 * Every error response — 400/401/403/404/409/422/429/500 alike — shares one
 * JSON shape: `{ type, message, param? }`. The vendor's own `type`
 * (`authentication_error` | `invalid_request_error` | `rate_limit_error` |
 * `api_error`) is what a caller should branch on, not the HTTP status alone:
 * a 403 is still `authentication_error` but means "your plan lacks API
 * access", not "your key is wrong".
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import bookingList from "./actions/booking-list.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingCancel from "./actions/booking-cancel.ts";
import bookingRequestReschedule from "./actions/booking-request-reschedule.ts";
import bookingReassign from "./actions/booking-reassign.ts";
import bookingMarkNoShow from "./actions/booking-mark-no-show.ts";

import bookingCalendarList from "./actions/booking-calendar-list.ts";
import bookingCalendarGet from "./actions/booking-calendar-get.ts";
import bookingCalendarTimeSlotsGet from "./actions/booking-calendar-time-slots-get.ts";
import bookingCalendarSchedule from "./actions/booking-calendar-schedule.ts";
import bookingCalendarOneTimeLinkCreate from "./actions/booking-calendar-one-time-link-create.ts";

import smsNotificationList from "./actions/sms-notification-list.ts";

import userList from "./actions/user-list.ts";
import userCreate from "./actions/user-create.ts";
import userGet from "./actions/user-get.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";
import userSchedulingAvailabilityGet from "./actions/user-scheduling-availability-get.ts";
import userSchedulingAvailabilityUpdate from "./actions/user-scheduling-availability-update.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";

import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Bookings
    bookingList,
    bookingGet,
    bookingCancel,
    bookingRequestReschedule,
    bookingReassign,
    bookingMarkNoShow,
    // Booking Calendars
    bookingCalendarList,
    bookingCalendarGet,
    bookingCalendarTimeSlotsGet,
    bookingCalendarSchedule,
    bookingCalendarOneTimeLinkCreate,
    // Notifications
    smsNotificationList,
    // Users
    userList,
    userCreate,
    userGet,
    userUpdate,
    userDelete,
    userSchedulingAvailabilityGet,
    userSchedulingAvailabilityUpdate,
    // Teams
    teamList,
    teamGet,
    // Contacts
    contactList,
    contactCreate,
    contactGet,
    contactUpdate,
    contactDelete,
    // Webhooks
    webhookCreate,
    webhookList,
    webhookGet,
    webhookDelete,
  ],
  // API key only. OnceHub publishes no OAuth surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
