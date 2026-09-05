/**
 * Telnyx — programmable voice, messaging (SMS/MMS) and numbers, over the
 * Telnyx API v2 (`api.telnyx.com/v2`).
 *
 * Every path, param, body field and response shape here was verified against
 * Telnyx's own public OpenAPI 3 document
 * (`https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json`,
 * `info.version` `2.0.0`, ~6.7 MB, fetched 2026-09-05), plus a live probe of
 * `status.telnyx.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The three findings that shaped this app:
 *
 *  1. **A call needs a Call Control Application, not just a phone number**
 *     (`actions/make-call.ts`). `connection_id` is `required` alongside
 *     `to`/`from` in `CallRequest` — it names a Call Control Application
 *     created once in the Telnyx portal. There is no way to dial with a bare
 *     phone number.
 *  2. **Calling and messaging are both fire-and-poll, not request/response.**
 *     `POST /calls` answers with a `call_control_id` before the destination
 *     has answered; `POST /messages` answers `200` (not `201`) with the
 *     message merely queued, its per-recipient `status` still `queued` or
 *     `sending`. The eventual outcome of either arrives as a webhook this
 *     app does not subscribe to — `get-message` is provided for polling the
 *     message side.
 *  3. **The status page's components repeat with nothing to disambiguate
 *     them** (`health/service.ts`). "API V1" and "API V2" each appear twice
 *     with no `group`/`group_id` field in the API response at all — unlike
 *     the same repeated-name shape other apps in this pack resolve via
 *     `group_id` (e.g. Lever). The service check falls back to the
 *     page-level indicator except for the two component names ("Number
 *     Lookup API", "Outbound Calling Services - …") that are unique.
 *
 * Deliberately out of scope — see README.md for the full list — Call
 * Control's ~40 other in-call actions (gather, playback, recording, SIP
 * transfer, AI assistants, conferencing), WhatsApp/RCS messaging, number
 * ordering/porting, and the Fax, Video and Wireless products.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sendMessage from "./actions/send-message.ts";
import getMessage from "./actions/get-message.ts";
import makeCall from "./actions/make-call.ts";
import hangupCall from "./actions/hangup-call.ts";
import lookupNumber from "./actions/lookup-number.ts";
import listPhoneNumbers from "./actions/list-phone-numbers.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [sendMessage, getMessage, makeCall, hangupCall, lookupNumber, listPhoneNumbers],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
