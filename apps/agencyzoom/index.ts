/**
 * AgencyZoom — the insurance agency management CRM: leads move through sales
 * pipelines, sold leads become customers, customers hold policies, and tasks
 * drive the follow-up in between. This app covers that core loop over
 * AgencyZoom's API v1 (`api.agencyzoom.com`).
 *
 * Every path, verb, parameter and response field here was verified on
 * 2026-09-05 against AgencyZoom's own OpenAPI 3.0 document
 * (`app.agencyzoom.com/openapi/agencyzoom.yaml`, 316,160 bytes, `info.version`
 * `1.0.0`) plus live probes against `api.agencyzoom.com`. Nothing here came
 * from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Auth is a login exchange, not an API key** (`auth/login.ts`). A
 *     username and password are exchanged once for a JWT; there is no
 *     documented refresh endpoint, so this app re-runs the login when the
 *     session goes bad.
 *  2. **One endpoint demands a second, undocumented header** (`auth/login.ts`,
 *     `actions/policy-create.ts`). `POST /v1/api/policies/create` documents a
 *     required `X-Api-Token` header on top of the usual bearer — the only such
 *     header in the whole document.
 *  3. **Two error shapes coexist, and the OpenAPI document names only one**
 *     (`lib/client.ts`). Documented `400`/`500` responses are
 *     `{"error", "fieldErrors"}`; a live `401` answers a completely different,
 *     undocumented `{"name", "message", "code", "status"}` shape.
 *  4. **Money is in cents, inconsistently labelled** (`lib/client.ts`). Some
 *     premium/fee fields say so in their own description; others (e.g.
 *     `Lead.premium`) do not, despite being the same figure on the same
 *     object graph once a lead is sold.
 *  5. **Dates are free-text strings in at least three formats**
 *     (`lib/client.ts`) — `YYYY-MM-DD` for lead/customer/task search filters,
 *     `MM/dd/YYYY` for policy and opportunity dates, `mm/dd/yy` for
 *     `birthday`/`nextExpirationDate`, and yet another,
 *     `YYYY-MM-DD HH:mm:ss`, for a task's `dueDatetime`.
 *  6. **The rate limit is prose only.** No endpoint documents a `429`, and a
 *     live probe carries no rate-limit header — see `health/quota.ts`.
 *
 * Not covered: business/commercial leads (`leads/create-biz-lead`), vehicles
 * and drivers on an opportunity, email/text threads, life & health quoting
 * (`/v1/api/life`), service tickets, files, and the V4 SSO login flow. See
 * `README.md` for the full list and why.
 */
import type { AppDefinition } from "@w6w/types";
import login from "./auth/login.ts";

import pipelineList from "./actions/pipeline-list.ts";
import pipelineStageList from "./actions/pipeline-stage-list.ts";
import leadSourceList from "./actions/lead-source-list.ts";
import carrierList from "./actions/carrier-list.ts";
import employeeList from "./actions/employee-list.ts";
import csrList from "./actions/csr-list.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadNoteCreate from "./actions/lead-note-create.ts";
import leadChangeStatus from "./actions/lead-change-status.ts";
import leadSold from "./actions/lead-sold.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerPolicyList from "./actions/customer-policy-list.ts";

import policyCreate from "./actions/policy-create.ts";
import policyUpdateStatus from "./actions/policy-update-status.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskComplete from "./actions/task-complete.ts";
import taskDelete from "./actions/task-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Reference lookups
    pipelineList,
    pipelineStageList,
    leadSourceList,
    carrierList,
    employeeList,
    csrList,
    // Leads
    leadList,
    leadGet,
    leadCreate,
    leadUpdate,
    leadNoteCreate,
    leadChangeStatus,
    leadSold,
    // Customers
    customerList,
    customerGet,
    customerPolicyList,
    // Policies
    policyCreate,
    policyUpdateStatus,
    // Tasks
    taskList,
    taskCreate,
    taskGet,
    taskComplete,
    taskDelete,
  ],
  auth: [login],
  healthChecks: [service, quota],
} satisfies AppDefinition;
