/**
 * Datadog — the observability platform: submit metrics and events, query
 * timeseries, and read monitors, downtimes, dashboards, logs, hosts and users,
 * over the Datadog API v1 and v2.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Datadog's own OpenAPI documents — the
 * `.generator/schemas/v1/openapi.yaml` (1,664,082 bytes, 150 paths) and
 * `v2/openapi.yaml` (7,585,237 bytes, 950 paths) published in
 * `DataDog/datadog-api-client-python`, which is what `docs.datadoghq.com/api/latest/`
 * and every official Datadog client are generated from — plus live probes
 * against all nine `api.<site>` hosts and all nine `status.<site>` hosts.
 * Nothing here came from a third-party integration directory.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Datadog is nine deployments, not one** (`lib/sites.ts`). Nine
 *     hostnames, nine data sets, no cross-site anything, and a key from the
 *     wrong site is a `403` indistinguishable from a revoked one. The site is a
 *     required Auth field, all nine `api.<site>` hosts are enumerated in
 *     `network.allow`, and every error message names the host that refused.
 *  2. **Two of Datadog's v2 write endpoints are not on `api.<site>`**
 *     (`actions/event-post.ts`). `POST /api/v2/events` is on
 *     `event-management-intake.<site>` and `POST /api/v2/logs` on
 *     `http-intake.logs.<site>`, via per-operation `servers` overrides that the
 *     human reference does not render. This app posts events through
 *     `POST /api/v1/events`, which really is on `api.<site>`, and ships no logs.
 *  3. **`GET /api/v1/validate` answers 403 where the rest of the API answers
 *     401** (`lib/client.ts`, `auth/api-key.ts`), byte-identically for a missing
 *     key and a wrong one. Every verdict in this app comes from a response
 *     body — `{"valid": true}` — never from a status code.
 *  4. **No Datadog status page has an API component** (`health/service.ts`,
 *     `health/api.ts`). All eight publish 38–39 *product* components and not one
 *     of them mentions the API, so "is Datadog up?" and "is `api.<site>`
 *     answering?" are two checks here, not one. UK1 publishes no status page at
 *     all, which the `service` check states rather than guessing around.
 *  5. **Two error body shapes** (`lib/client.ts`): `{"errors": ["Forbidden"]}`
 *     for v1 and most of v2, `{"errors": [{status, title, detail}]}` for the
 *     JSON:API-shaped v2 resources. Reading `errors[0]` as a string prints
 *     `[object Object]` for half the API.
 *
 * And three spellings of "when" coexist across the surface, none of them wrong:
 * v1 takes POSIX seconds, v2 events take milliseconds, v2 logs take date math
 * (`now-15m`). Each is stated in the param hint of the action that takes it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import validate from "./actions/validate.ts";
import currentUserGet from "./actions/current-user-get.ts";
import userList from "./actions/user-list.ts";

import metricSubmit from "./actions/metric-submit.ts";
import metricQuery from "./actions/metric-query.ts";
import metricList from "./actions/metric-list.ts";
import metricMetadataGet from "./actions/metric-metadata-get.ts";

import eventPost from "./actions/event-post.ts";
import eventSearch from "./actions/event-search.ts";
import eventGet from "./actions/event-get.ts";

import monitorList from "./actions/monitor-list.ts";
import monitorGet from "./actions/monitor-get.ts";
import monitorSearch from "./actions/monitor-search.ts";

import downtimeList from "./actions/downtime-list.ts";
import downtimeGet from "./actions/downtime-get.ts";
import downtimeSchedule from "./actions/downtime-schedule.ts";
import downtimeCancel from "./actions/downtime-cancel.ts";

import dashboardList from "./actions/dashboard-list.ts";
import dashboardGet from "./actions/dashboard-get.ts";

import logSearch from "./actions/log-search.ts";

import hostList from "./actions/host-list.ts";
import hostTotalsGet from "./actions/host-totals-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Submission — the API key alone is enough for these two, so they work on a
    // connection with no application key. Everything below needs both.
    metricSubmit,
    eventPost,
    // Metrics
    metricQuery,
    metricList,
    metricMetadataGet,
    // Events
    eventSearch,
    eventGet,
    // Monitors
    monitorList,
    monitorGet,
    monitorSearch,
    // Downtimes
    downtimeList,
    downtimeGet,
    downtimeSchedule,
    downtimeCancel,
    // Dashboards
    dashboardList,
    dashboardGet,
    // Logs
    logSearch,
    // Infrastructure
    hostList,
    hostTotalsGet,
    // Account
    validate,
    currentUserGet,
    userList,
  ],
  // One method. Datadog's OAuth2 (`AuthZ`) surface exists in the spec, but its
  // `authorizationUrl` is the relative `/oauth2/v1/authorize` of a Datadog OAuth
  // *client*, which is a published-integration programme rather than something a
  // user can configure — so keys are the whole authentication story here.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
