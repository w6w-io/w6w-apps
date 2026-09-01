/**
 * Holded — the CRM API (`api.holded.com/api/crm/v1`): sales funnels, leads
 * and calendar events.
 *
 * Every path, verb, request/response field and auth detail in this app was
 * verified on 2026-09-01 against the CRM API's own OpenAPI 3.0 document
 * (`info.title` "CRM API", `info.version` "1.0") plus live probes against
 * `api.holded.com`. See `lib/client.ts` for how that document was reached —
 * Holded's vanity documentation domain (`developers.holded.com`) now
 * redirects to a marketing page with fabricated technical claims; the real,
 * current reference lives on the underlying `holded.readme.io` project.
 *
 * ## Scope: CRM only
 *
 * Holded's API is split into separate groups on the same host — Invoicing
 * (`/api/invoicing/v1`, contacts/products/documents/payments/…), Accounting,
 * Projects, and Team — each its own OpenAPI document. This app only reaches
 * `/api/crm/v1` and covers its three resources in full: Funnels, Leads (plus
 * their notes, tasks, creation date and stage), and Events. Holded's newer
 * Bookings surface (`/bookings`, `/bookings/locations`) is also part of the
 * CRM API document but is deliberately left out here — it is a distinct
 * appointment-scheduling flow (locations, available slots, cancellation) that
 * was not exercised against a live account in this pass, and guessing at its
 * behaviour would be worse than leaving it for a future app or a dedicated
 * addition once it can be verified end to end.
 *
 * ## Auth
 *
 * One credential type: an account-wide API key, sent as the raw value of a
 * `key` request header (not `Bearer`, not a query parameter). See
 * `auth/api-key.ts`.
 *
 * ## No pagination, anywhere
 *
 * None of the three list endpoints (`GET /funnels`, `GET /leads`,
 * `GET /events`) documents a query parameter of any kind — confirmed directly
 * from the OpenAPI document's `parameters` field for each, which is absent on
 * all three. A List action here returns the account's entire collection in
 * one call.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import funnelList from "./actions/funnel-list.ts";
import funnelGet from "./actions/funnel-get.ts";
import funnelCreate from "./actions/funnel-create.ts";
import funnelUpdate from "./actions/funnel-update.ts";
import funnelDelete from "./actions/funnel-delete.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadNoteCreate from "./actions/lead-note-create.ts";
import leadNoteUpdate from "./actions/lead-note-update.ts";
import leadTaskCreate from "./actions/lead-task-create.ts";
import leadTaskUpdate from "./actions/lead-task-update.ts";
import leadTaskDelete from "./actions/lead-task-delete.ts";
import leadDateUpdate from "./actions/lead-date-update.ts";
import leadStageUpdate from "./actions/lead-stage-update.ts";

import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventUpdate from "./actions/event-update.ts";
import eventDelete from "./actions/event-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Funnels
    funnelList,
    funnelGet,
    funnelCreate,
    funnelUpdate,
    funnelDelete,
    // Leads
    leadList,
    leadGet,
    leadCreate,
    leadUpdate,
    leadDelete,
    leadNoteCreate,
    leadNoteUpdate,
    leadTaskCreate,
    leadTaskUpdate,
    leadTaskDelete,
    leadDateUpdate,
    leadStageUpdate,
    // Events
    eventList,
    eventGet,
    eventCreate,
    eventUpdate,
    eventDelete,
  ],
  // API key only. Holded's CRM API publishes no OAuth surface for third-party
  // apps; the account key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
