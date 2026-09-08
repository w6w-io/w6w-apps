/**
 * Jibble — time-tracking and attendance, over its OData-flavoured REST API spread across
 * five microservice hosts (`identity`, `workspace`, `time-tracking`, `time-attendance`,
 * `authorization`).
 *
 * Every path, verb, query parameter and body field in this app was verified on 2026-09-06
 * against Jibble's own public Postman collection (`docs.api.jibble.io`, collection id
 * `11516962-9900ee92-5a41-4f67-9bfa-005dcc0c3d7b`), fetched as raw JSON, not scraped from
 * rendered HTML and not sourced from any third-party integration directory.
 *
 * The findings that shaped this app's design, each documented in full where it matters:
 *
 *  1. **Five hosts, one credential, one scope** (`lib/client.ts`). There is no single API
 *     host, but one `client_credentials` token (scope `api1`, always) authenticates against
 *     all of them.
 *  2. **No `@odata.nextLink` — pagination is `$skip`/`$top` driven by the caller**
 *     (`lib/client.ts`). Assuming a follow-up link exists silently truncates a report.
 *  3. **Two id-addressing styles coexist** (`lib/client.ts`). Most singular resources are
 *     `Resource(id)`; `TimeEntries` uses a plain `/TimeEntries/{id}` path segment instead.
 *  4. **"Delete Time Entry" doesn't delete anything** (`actions/time-entry-archive.ts`) — it's
 *     a `PATCH .../{id}` status flip to `Archived`, unlike `member-delete`'s real `DELETE`.
 *  5. **The example `expires_in` is `Int32.MaxValue`** (`auth/client-credentials.ts`) — a
 *     ~68-year token lifetime sentinel, not a typical short-lived OAuth token.
 *  6. **No verifiable vendor status page, and no reliable rate-limit headroom signal**
 *     (`health/service.ts`, `health/quota.ts`) — both declared as absences with the evidence
 *     recorded, rather than guessed at.
 *
 * Out of scope for this build (confirmed to exist in the vendor's API, but not implemented
 * here — see README.md for the full list and why): kiosks, schedules, positions, screenshots,
 * payroll pay-periods, calendars/holidays, roles/authorization, webhooks, and the
 * `Prefer: respond-async` bulk-export flow.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import organizationGet from "./actions/organization-get.ts";

import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberCreate from "./actions/member-create.ts";
import memberUpdate from "./actions/member-update.ts";
import memberArchive from "./actions/member-archive.ts";
import memberDelete from "./actions/member-delete.ts";

import locationList from "./actions/location-list.ts";
import locationCreate from "./actions/location-create.ts";

import activityList from "./actions/activity-list.ts";
import projectList from "./actions/project-list.ts";
import clientList from "./actions/client-list.ts";
import groupList from "./actions/group-list.ts";

import timeEntryList from "./actions/time-entry-list.ts";
import timeEntryClockIn from "./actions/time-entry-clock-in.ts";
import timeEntryClockOut from "./actions/time-entry-clock-out.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";
import timeEntryArchive from "./actions/time-entry-archive.ts";
import latestTimeEntryGet from "./actions/latest-time-entry-get.ts";

import timeOffList from "./actions/time-off-list.ts";
import timeOffCreate from "./actions/time-off-create.ts";
import timeOffUpdateStatus from "./actions/time-off-update-status.ts";
import leaveBalanceList from "./actions/leave-balance-list.ts";

import timesheetList from "./actions/timesheet-list.ts";
import trackedTimeReportGet from "./actions/tracked-time-report-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Organization
    organizationGet,
    // Members
    memberList,
    memberGet,
    memberCreate,
    memberUpdate,
    memberArchive,
    memberDelete,
    // Locations
    locationList,
    locationCreate,
    // Reference data
    activityList,
    projectList,
    clientList,
    groupList,
    // Time entries
    timeEntryList,
    timeEntryClockIn,
    timeEntryClockOut,
    timeEntryUpdate,
    timeEntryArchive,
    latestTimeEntryGet,
    // Time off
    timeOffList,
    timeOffCreate,
    timeOffUpdateStatus,
    leaveBalanceList,
    // Attendance reporting
    timesheetList,
    trackedTimeReportGet,
  ],
  // OAuth2 client_credentials only. Jibble publishes no user-delegated OAuth flow for this
  // API surface — a client_credentials grant is the whole authentication story.
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
