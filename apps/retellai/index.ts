/**
 * Retell AI — the AI voice-agent / phone-call platform: place outbound phone
 * and web calls, batch-dial a list of numbers, search call history, and read
 * agent/phone-number/voice catalogs, over `api.retellai.com`.
 *
 * Every path, verb, query parameter, body field and error shape in this app
 * was verified on 2026-08-24 against Retell's own machine-readable OpenAPI
 * 3.1 document (`docs.retellai.com/openapi.yaml`, a Mintlify docs site, 13,058
 * lines) plus live probes against `api.retellai.com`. Nothing here came from
 * a third-party integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two error envelopes, not one** (`lib/client.ts`, `auth/api-key.ts`).
 *     A missing `Authorization` header answers an UNDOCUMENTED
 *     `{"error_message": "..."}`, while every other 4xx/5xx — including an
 *     invalid key — answers the OpenAPI-documented `{"status":"error",
 *     "message":"..."}`. Both confirmed live on 2026-08-24. A caller reading
 *     only `message` silently drops the missing-credential case.
 *  2. **Three pagination conventions across one API** (`lib/client.ts`).
 *     `v3/list-calls` takes limit/sort/cursor/filters all in the POST body;
 *     `v2/list-agents` is a POST whose pagination is in the QUERY string and
 *     whose filter is in the body; `v2/list-phone-numbers` is a plain GET
 *     with query-string pagination; `list-voices` returns a bare unpaginated
 *     array with no cursor at all.
 *  3. **Concurrency, not request rate, is the readable ceiling**
 *     (`health/quota.ts`, `actions/get-concurrency.ts`). Retell's 429 body
 *     carries no rate-limit header of any kind, but `GET /get-concurrency`
 *     reports exact current/limit figures for ongoing calls — the number
 *     that actually stops a batch run.
 *
 * A call's interesting fields (transcript, recording, analysis) populate
 * only after `call_status` reaches `ended` — creating a call is fire-and-poll
 * (or webhook), never fire-and-read. See `actions/create-phone-call.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import createPhoneCall from "./actions/create-phone-call.ts";
import createWebCall from "./actions/create-web-call.ts";
import createBatchCall from "./actions/create-batch-call.ts";
import getCall from "./actions/get-call.ts";
import listCalls from "./actions/list-calls.ts";
import listAgents from "./actions/list-agents.ts";
import listPhoneNumbers from "./actions/list-phone-numbers.ts";
import listVoices from "./actions/list-voices.ts";
import getConcurrency from "./actions/get-concurrency.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Calls
    createPhoneCall,
    createWebCall,
    createBatchCall,
    getCall,
    listCalls,
    // Catalog reads
    listAgents,
    listPhoneNumbers,
    listVoices,
    getConcurrency,
  ],
  // API key only. Retell publishes no OAuth surface for third-party apps —
  // the bearer key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
