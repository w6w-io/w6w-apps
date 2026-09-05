/**
 * Ticket Tailor — event ticketing: event series and occurrences, ticket
 * types, orders, holds, check-ins, discounts, vouchers, and issued tickets,
 * over the Ticket Tailor API v1 (`api.tickettailor.com`).
 *
 * Every path, verb, field and error shape in this app was verified on
 * 2026-09-05 against the vendor's own OpenAPI 3.1.1 document — fetched live
 * from `https://app.tickettailor-stitching.com/openapi.yml`, the source the
 * public reference site (`developers.tickettailor.com`, a Docusaurus site
 * whose OpenAPI pages render client-side from that same URL) compiles its
 * pages from — plus live probes against `api.tickettailor.com` and
 * `status.tickettailor.com`. Nothing here came from a third-party
 * integration directory.
 *
 * The three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The public docs show two different auth recipes on one page**
 *     (`lib/client.ts`). The "Header" tab says `base64(api_key)` alone; the
 *     "Username" tab shows `curl -u 'API_KEY:'`. The OpenAPI security scheme
 *     (`type: http, scheme: basic`) settles it: RFC 7617 basic auth is
 *     `base64(username ":" password)`, so this app sends `base64(key + ":")`
 *     — the key as username, empty password.
 *  2. **Every write is `application/x-www-form-urlencoded`, never JSON; every
 *     "update" is `POST`, never `PATCH`/`PUT`; every `DELETE` answers `200`
 *     with a small body, never `204`** (`lib/client.ts`). No endpoint in the
 *     entire document declares a JSON request body.
 *  3. **`/v1/ping` needs no credential and cannot be the health probe**
 *     (`auth/api-key.ts`). It answers `200 {"version":"1.0"}` with no
 *     `Authorization` header at all — confirmed live — and its own OpenAPI
 *     operation has no `security` block, unlike every other endpoint. Worse,
 *     every kind of auth failure (missing, malformed, wrong, or a valid key
 *     correctly scoped away from a resource) collapses to the SAME
 *     `403 FORBIDDEN` body, confirmed live against both `/v1/overview` and
 *     `/v1/orders` — so `test` cannot distinguish "wrong key" from
 *     "under-scoped key" and says so rather than inventing a distinction the
 *     API does not make.
 *
 * A fourth, smaller trap: the OpenAPI document's own `example` for `ping`
 * shows `{"version": "pong"}`; the live response is `{"version": "1.0"}`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import eventSeriesList from "./actions/event-series-list.ts";
import eventSeriesGet from "./actions/event-series-get.ts";
import eventSeriesCreate from "./actions/event-series-create.ts";
import eventSeriesUpdate from "./actions/event-series-update.ts";
import eventSeriesDelete from "./actions/event-series-delete.ts";
import eventSeriesStatusUpdate from "./actions/event-series-status-update.ts";

import eventOccurrenceList from "./actions/event-occurrence-list.ts";
import eventOccurrenceGet from "./actions/event-occurrence-get.ts";
import eventOccurrenceCreate from "./actions/event-occurrence-create.ts";

import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";

import ticketTypeCreate from "./actions/ticket-type-create.ts";
import ticketTypeUpdate from "./actions/ticket-type-update.ts";
import ticketTypeDelete from "./actions/ticket-type-delete.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderConfirmPaymentReceived from "./actions/order-confirm-payment-received.ts";

import holdList from "./actions/hold-list.ts";
import holdGet from "./actions/hold-get.ts";
import holdCreate from "./actions/hold-create.ts";
import holdUpdate from "./actions/hold-update.ts";
import holdDelete from "./actions/hold-delete.ts";

import checkInList from "./actions/check-in-list.ts";
import checkInCreate from "./actions/check-in-create.ts";

import discountList from "./actions/discount-list.ts";
import discountGet from "./actions/discount-get.ts";
import discountCreate from "./actions/discount-create.ts";
import discountUpdate from "./actions/discount-update.ts";
import discountDelete from "./actions/discount-delete.ts";

import voucherList from "./actions/voucher-list.ts";
import voucherGet from "./actions/voucher-get.ts";
import voucherCreate from "./actions/voucher-create.ts";
import voucherDelete from "./actions/voucher-delete.ts";
import voucherCodeList from "./actions/voucher-code-list.ts";
import voucherCodeVoid from "./actions/voucher-code-void.ts";

import issuedTicketList from "./actions/issued-ticket-list.ts";
import issuedTicketGet from "./actions/issued-ticket-get.ts";
import issuedTicketCreate from "./actions/issued-ticket-create.ts";
import issuedTicketVoid from "./actions/issued-ticket-void.ts";

import overviewGet from "./actions/overview-get.ts";
import ping from "./actions/ping.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Event series
    eventSeriesList,
    eventSeriesGet,
    eventSeriesCreate,
    eventSeriesUpdate,
    eventSeriesDelete,
    eventSeriesStatusUpdate,
    // Event occurrences (within a series)
    eventOccurrenceList,
    eventOccurrenceGet,
    eventOccurrenceCreate,
    // Events (box-office-wide)
    eventList,
    eventGet,
    // Ticket types
    ticketTypeCreate,
    ticketTypeUpdate,
    ticketTypeDelete,
    // Orders
    orderList,
    orderGet,
    orderConfirmPaymentReceived,
    // Holds
    holdList,
    holdGet,
    holdCreate,
    holdUpdate,
    holdDelete,
    // Check-ins
    checkInList,
    checkInCreate,
    // Discounts
    discountList,
    discountGet,
    discountCreate,
    discountUpdate,
    discountDelete,
    // Vouchers
    voucherList,
    voucherGet,
    voucherCreate,
    voucherDelete,
    voucherCodeList,
    voucherCodeVoid,
    // Issued tickets
    issuedTicketList,
    issuedTicketGet,
    issuedTicketCreate,
    issuedTicketVoid,
    // Box office
    overviewGet,
    ping,
  ],
  // API key only. Ticket Tailor publishes no OAuth surface for third-party
  // apps; the key, sent as HTTP Basic, is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
