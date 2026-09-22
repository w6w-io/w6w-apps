/**
 * Hubstaff — time tracking and workforce management: the organizations,
 * members, projects, teams, clients, tasks, activities and timesheets an
 * integration reads, plus the three writes Hubstaff API v2 actually offers for
 * them (a manual time entry, a task, a timesheet's approval status), over
 * `api.hubstaff.com/v2`.
 *
 * Every path, verb, query parameter, body field and enum in this app was taken
 * from Hubstaff's own OpenAPI document at <https://api.hubstaff.com/v2/docs>
 * (fetched 2026-09-22: 510,300 bytes, Swagger 2.0, `info.version` `2.0`, one
 * server `https://api.hubstaff.com`, 135 paths, 132 definitions) plus the
 * rendered guides under <https://developer.hubstaff.com/>. Live probes against
 * `api.hubstaff.com` and `status.hubstaff.com` confirmed the auth and error
 * behaviour. Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **One credential kind fits, and it is the least fashionable one**
 *     (`auth/organization-access-token.ts`). Personal access tokens are
 *     *refresh* tokens that must be exchanged, every 24 hours, for a rotating
 *     access token at a second host (`account.hubstaff.com`); OAuth needs a
 *     browser. An **Organization access token** (`hsoat_…`) is a single opaque
 *     secret sent directly as `Authorization: Bearer`, and it authenticates as
 *     the member an admin assigned it to. No exchange, no refresh, no second
 *     host, nothing stateful in `sign`.
 *  2. **Two structurally different 401s, and a 403 that means something else**
 *     (`lib/client.ts`, `auth/organization-access-token.ts`). A request with no
 *     credential answers `{"code":"not_authorized","error_code":10001,…}`; a
 *     malformed token answers `{"error":"invalid_token","error_description":…}`
 *     with no `code` field at all, mirrored in `WWW-Authenticate`. Validity is
 *     therefore judged from the body's machine-readable fields, never the
 *     status code.
 *  3. **Time entries are write-only** (`actions/time-entry-create.ts`). The
 *     `time_entries` tag contains exactly one operation — create — and the two
 *     reads that look like they should cover it answer different questions:
 *     timesheets are "aggregate approval records … not individual time
 *     entries" (the vendor's wording), and activities are 10-minute tracked
 *     blocks delayed by up to 20 minutes.
 *  4. **Cursor pagination the schema does not declare** (`lib/client.ts`).
 *     Every list endpoint takes `page_start_id` / `page_limit` (default 100,
 *     max 500) and the prose guide promises a `pagination.next_page_start_id`
 *     in the response — but no list response schema in the OpenAPI document
 *     mentions `pagination`, and the document declares no response headers
 *     anywhere either. Every list action here returns one page and documents
 *     the cursor explicitly rather than following it in a loop.
 *
 * Scope is deliberate: the core read surface plus three writes, not all ~40
 * resource families. The README lists what was left out and why.
 */
import type { AppDefinition } from "@w6w/types";
import organizationAccessToken from "./auth/organization-access-token.ts";

import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";

import userMe from "./actions/user-me.ts";
import userGet from "./actions/user-get.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";

import memberList from "./actions/member-list.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";

import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";

import timeEntryCreate from "./actions/time-entry-create.ts";

import timesheetList from "./actions/timesheet-list.ts";
import timesheetUpdateStatus from "./actions/timesheet-update-status.ts";

import activityList from "./actions/activity-list.ts";
import projectActivityList from "./actions/project-activity-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Organizations
    organizationList,
    organizationGet,
    // Users
    userMe,
    userGet,
    // Projects
    projectList,
    projectGet,
    // Members
    memberList,
    // Teams
    teamList,
    teamGet,
    // Clients
    clientList,
    clientGet,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    // Time entries (create only — v2 has no read for them)
    timeEntryCreate,
    // Timesheets
    timesheetList,
    timesheetUpdateStatus,
    // Activities
    activityList,
    projectActivityList,
  ],
  // An Organization access token only: a long-lived `hsoat_…` secret, sent
  // straight as a bearer. PATs need a token-exchange handshake against a second
  // host and OAuth needs a browser, so neither is offered here.
  auth: [organizationAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
