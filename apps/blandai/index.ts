/**
 * Bland — enterprise voice AI (phone calls, conversational pathways, phone
 * numbers, voices) over `api.bland.ai`.
 *
 * Every path, header, and response shape here was verified on 2026-08-29
 * against Bland's own documentation (`docs.bland.ai`, a Mintlify deployment)
 * via its `llms-full.txt` export (1,829,091 bytes — the full reference
 * concatenated with the real `METHOD https://host/path` line Mintlify
 * renders above each endpoint), cross-checked with live, unauthenticated
 * probes against `api.bland.ai` and `status.bland.ai`. See `lib/client.ts`
 * for the wire-level findings (auth header shape, the two response
 * envelopes, the two endpoints that live outside `/v1`).
 *
 * This app covers Bland's core call, pathway, number, and voice surface —
 * send/list/get/stop/transfer/analyze a call, list/get/create/update/delete a
 * pathway, list/get/purchase a phone number, and list/get a voice — plus
 * account status. Bland's reference also documents a much larger surface
 * (agent testing, evals, knowledge bases, widgets, SMS/RCS/iMessage
 * messaging, SIP trunks, memory, triage, custom dialing pools, personas) that
 * is out of scope for this v1; see README.md for what was deliberately left
 * out and why.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import callSend from "./actions/call-send.ts";
import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callListActive from "./actions/call-list-active.ts";
import callStop from "./actions/call-stop.ts";
import callStopAll from "./actions/call-stop-all.ts";
import callTransfer from "./actions/call-transfer.ts";
import callAnalyze from "./actions/call-analyze.ts";

import pathwayList from "./actions/pathway-list.ts";
import pathwayGet from "./actions/pathway-get.ts";
import pathwayCreate from "./actions/pathway-create.ts";
import pathwayUpdate from "./actions/pathway-update.ts";
import pathwayDelete from "./actions/pathway-delete.ts";

import numberList from "./actions/number-list.ts";
import numberGet from "./actions/number-get.ts";
import numberPurchase from "./actions/number-purchase.ts";

import voiceList from "./actions/voice-list.ts";
import voiceGet from "./actions/voice-get.ts";

import accountGet from "./actions/account-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Calls
    callSend,
    callList,
    callGet,
    callListActive,
    callStop,
    callStopAll,
    callTransfer,
    callAnalyze,
    // Pathways
    pathwayList,
    pathwayGet,
    pathwayCreate,
    pathwayUpdate,
    pathwayDelete,
    // Numbers
    numberList,
    numberGet,
    numberPurchase,
    // Voices
    voiceList,
    voiceGet,
    // Account
    accountGet,
  ],
  // API key only. Bland publishes no OAuth surface for this REST API.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
