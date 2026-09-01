/**
 * PhantomBuster — the browser-automation platform: launch "Phantoms" (agents),
 * poll the containers they create, and read the output or result object each
 * container produces, over the PhantomBuster API v2 (`api.phantombuster.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-01 against PhantomBuster's own OpenAPI 3.0 document
 * (`hub.phantombuster.com/reference`, mirrored at
 * `github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json`,
 * `info.version` `2.0.0`) plus live probes against `api.phantombuster.com`
 * and `status.phantombuster.com`. Nothing here came from a third-party
 * integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The vendor's own prose "API" guide describes the wrong generation.**
 *     `hub.phantombuster.com/docs/api` documents header `X-Phantombuster-Key-1`
 *     and base `phantombuster.com/api/v1`; every endpoint this app calls is v2,
 *     with header `X-Phantombuster-Key` and base `api.phantombuster.com/api/v2`
 *     — both confirmed live. See `lib/client.ts`.
 *  2. **Ordinary reads return live credentials, worse than most apps in this
 *     pack.** `GET /orgs/fetch` unconditionally returns org-wide magic-link
 *     login tokens and, for onboarded orgs, a raw pasted session cookie;
 *     `GET /agents/fetch` always returns that agent's dedicated proxy
 *     password. Two OTHER secret blocks (`proxies`, `crmIntegrations` — the
 *     latter holding CRM OAuth **refresh tokens**) are vendor-gated behind
 *     opt-in query flags this app simply never sets. See `lib/client.ts`,
 *     `lib/params.ts` and `actions/org-get.ts`.
 *  3. **No documented rate limiting anywhere** — not in the OpenAPI document,
 *     not in any guide, not on the wire. See `health/request-rate.ts`.
 *  4. **`/users/fetch-me` is excluded entirely**, not merely stripped: it is
 *     `security: []` in the vendor's own spec, may mint a session as a side
 *     effect of a GET, and unconditionally returns a session id and a Zendesk
 *     token. See `auth/api-key.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import agentList from "./actions/agent-list.ts";
import agentGet from "./actions/agent-get.ts";
import agentLaunch from "./actions/agent-launch.ts";
import agentStop from "./actions/agent-stop.ts";
import agentDelete from "./actions/agent-delete.ts";
import agentFetchOutput from "./actions/agent-fetch-output.ts";
import agentFetchDeleted from "./actions/agent-fetch-deleted.ts";

import containerList from "./actions/container-list.ts";
import containerGet from "./actions/container-get.ts";
import containerOutput from "./actions/container-output.ts";
import containerResultObject from "./actions/container-result-object.ts";

import orgGet from "./actions/org-get.ts";
import orgResourcesGet from "./actions/org-resources-get.ts";
import orgRunningContainersList from "./actions/org-running-containers-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Agents
    agentList,
    agentGet,
    agentLaunch,
    agentStop,
    agentDelete,
    agentFetchOutput,
    agentFetchDeleted,
    // Containers
    containerList,
    containerGet,
    containerOutput,
    containerResultObject,
    // Organization
    orgGet,
    orgResourcesGet,
    orgRunningContainersList,
  ],
  // API key only. PhantomBuster publishes no third-party OAuth surface; the
  // key (plus an optional org id for a key shared across organizations) is
  // the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
