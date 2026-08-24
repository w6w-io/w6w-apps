/**
 * Browse AI — the web-scraping and monitoring platform: run pre-built or
 * custom "robots", poll the tasks they create, manage monitors, bulk runs and
 * webhooks, over the Browse AI API v2 (`api.browse.ai`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-24 against Browse AI's own OpenAPI 3.1 document —
 * embedded in the Scalar renderer served at `docs.browse.ai/api/` (315,197
 * bytes of HTML; `info.version` `"v2"`) — plus live probes against
 * `api.browse.ai` and `browseai.statuspage.io`. Nothing here came from a
 * third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Missing and invalid credentials answer identically** (`auth/api-key.ts`).
 *     No `Authorization` header, an empty bearer, a fake key and a `Basic`
 *     scheme all returned the exact same `401 {"statusCode":401,
 *     "messageCode":"unauthorized"}` — unlike Apify's distinct
 *     `token-not-provided` vs `user-or-token-not-found`. A caller cannot tell
 *     "never sent" from "wrong" from the response body alone.
 *  2. **Two envelope shapes, not one** (`lib/client.ts`). Robots, monitors and
 *     webhooks answer `{statusCode, messageCode, <resource>: …}`; tasks and
 *     bulk runs answer the same shape one level deeper, under a generic
 *     `result` key. There is no way to guess which from the verb or path.
 *  3. **The documented "system status" endpoint still requires a credential**
 *     (`auth/api-key.ts`, `health/queue.ts`). `GET /v2/status` describes
 *     Browse AI's own infrastructure, not the caller's account, and most
 *     vendors leave that kind of endpoint public — Browse AI does not: it
 *     answers `401 unauthorized` with no token, verified live. That also
 *     makes it the credential probe: it needs a live key but leaks no
 *     business data in return.
 *  4. **List pagination is capped at 10 per page on Get Tasks** — the
 *     tightest ceiling in this pack, and easy to miss if you assume the usual
 *     100 (`lib/params.ts`, `actions/task-list.ts`).
 *  5. **No readable rate limit or credit balance anywhere** (`health/quota.ts`).
 *     The only metered signal is a `403 credits_limit_reached` refusal at the
 *     moment credits run out — there is no `/usage` endpoint to check first.
 *
 * The OpenAPI document also lists a `GET /v2/teams` operation, tagged
 * `internal` and documented as authenticated with an **Auth0 access token**
 * for Browse AI's own integrations — not the Bearer API key every other
 * endpoint takes. It is deliberately not exposed as an Action here; see
 * README "Deliberately not covered".
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import robotList from "./actions/robot-list.ts";
import robotGet from "./actions/robot-get.ts";
import robotCookiesSet from "./actions/robot-cookies-set.ts";

import taskList from "./actions/task-list.ts";
import taskRun from "./actions/task-run.ts";
import taskGet from "./actions/task-get.ts";

import monitorList from "./actions/monitor-list.ts";
import monitorCreate from "./actions/monitor-create.ts";
import monitorGet from "./actions/monitor-get.ts";
import monitorUpdate from "./actions/monitor-update.ts";
import monitorDelete from "./actions/monitor-delete.ts";

import bulkRunCreate from "./actions/bulk-run-create.ts";
import bulkRunList from "./actions/bulk-run-list.ts";
import bulkRunGet from "./actions/bulk-run-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import statusGet from "./actions/status-get.ts";

import service from "./health/service.ts";
import queue from "./health/queue.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Robots
    robotList,
    robotGet,
    robotCookiesSet,
    // Tasks
    taskList,
    taskRun,
    taskGet,
    // Monitors
    monitorList,
    monitorCreate,
    monitorGet,
    monitorUpdate,
    monitorDelete,
    // Bulk runs
    bulkRunCreate,
    bulkRunList,
    bulkRunGet,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
    // System
    statusGet,
  ],
  // API key only. Browse AI publishes no OAuth surface for third-party apps;
  // the key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, queue, quota],
} satisfies AppDefinition;
