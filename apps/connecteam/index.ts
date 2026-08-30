/**
 * Connecteam — deskless workforce management: employee directory, GPS time
 * clock, shift scheduling, digital forms and task boards, over Connecteam's
 * REST API v1 (`api.connecteam.com`).
 *
 * Every path, verb, query parameter and request/response field in this app
 * was verified on 2026-08-29 against Connecteam's own machine-readable
 * OpenAPI 3.1 document — discovered via its RFC 9727 API-catalog well-known
 * file (`developer.connecteam.com/.well-known/api-catalog`), which links
 * `openapi/connecteam-api-documentation.json` (616,945 bytes, `info.version`
 * `"v1"`) — plus live probes against `api.connecteam.com` the same day.
 * Nothing here was inferred from a sibling integration or a UI screenshot.
 *
 * The findings that shaped the design, each documented where it matters:
 *
 *  1. **Auth is a custom header, not a bearer token** (`auth/api-key.ts`).
 *     The intake's working assumption ("Bearer API key") was wrong: the
 *     vendor's `APIKeyHeader` scheme is `X-API-KEY: <key>` verbatim, no
 *     prefix, not on `Authorization`. A separate, fully documented OAuth2
 *     client-credentials flow also exists (`POST /oauth/v1/token`) but is
 *     deliberately not implemented — the static key already reaches every
 *     endpoint this app calls, with no token-refresh machinery to build.
 *  2. **Two different error shapes on failure, not one** (`lib/client.ts`).
 *     No credential at all is `401 {"error": "No authentication provided",
 *     ...}`; a wrong/revoked key is `403 {"detail": "Invalid API key"}` — the
 *     word `detail` also names the *422 validation* body, but there it is an
 *     array, not a string. Read the body's structure, not its status code.
 *  3. **There is no single-user "get" endpoint** (`actions/user-list.ts`).
 *     Only a list (narrowable by `userIds`) and a bulk archive/delete exist.
 *  4. **Bulk-shaped endpoints, single-record actions.** Create/update/delete
 *     for users, shifts and tasks all accept arrays (up to 20–500 items) in
 *     one call; every action here wraps a single record, matching this
 *     app's one-record-per-step model, and says so in its own doc comment.
 *  5. **No published or observed rate limit** (`health/quota.ts`). Checked
 *     live, both signed and unsigned: no `X-RateLimit-*` header of any kind,
 *     and zero matches for "rate limit" anywhere in the 616,945-byte OpenAPI
 *     document. Declared `unavailable`, `informational` rather than guessed.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import accountGet from "./actions/account-get.ts";

import userList from "./actions/user-list.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userArchive from "./actions/user-archive.ts";

import timeClockList from "./actions/time-clock-list.ts";
import clockIn from "./actions/clock-in.ts";
import clockOut from "./actions/clock-out.ts";
import timeActivityList from "./actions/time-activity-list.ts";
import timeActivityCreate from "./actions/time-activity-create.ts";
import timeActivityDelete from "./actions/time-activity-delete.ts";
import timesheetGet from "./actions/timesheet-get.ts";

import schedulerList from "./actions/scheduler-list.ts";
import shiftList from "./actions/shift-list.ts";
import shiftGet from "./actions/shift-get.ts";
import shiftCreate from "./actions/shift-create.ts";
import shiftUpdate from "./actions/shift-update.ts";
import shiftDelete from "./actions/shift-delete.ts";

import jobList from "./actions/job-list.ts";

import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formSubmissionList from "./actions/form-submission-list.ts";
import formSubmissionGet from "./actions/form-submission-get.ts";

import taskboardList from "./actions/taskboard-list.ts";
import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    accountGet,
    // Users
    userList,
    userCreate,
    userUpdate,
    userArchive,
    // Time clock
    timeClockList,
    clockIn,
    clockOut,
    timeActivityList,
    timeActivityCreate,
    timeActivityDelete,
    timesheetGet,
    // Scheduling
    schedulerList,
    shiftList,
    shiftGet,
    shiftCreate,
    shiftUpdate,
    shiftDelete,
    // Jobs
    jobList,
    // Forms
    formList,
    formGet,
    formSubmissionList,
    formSubmissionGet,
    // Tasks
    taskboardList,
    taskList,
    taskCreate,
    taskUpdate,
  ],
  // API key only. See the module docs above for why the documented OAuth2
  // client-credentials flow is not also implemented.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
