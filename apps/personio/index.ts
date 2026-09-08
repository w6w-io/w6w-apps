/**
 * Personio — HR and talent management (employees, absences, time tracking, documents,
 * custom reports) for German-market-focused SMBs and mid-market companies.
 *
 * Everything in this app was verified on 2026-09-06 against Personio's **own** OpenAPI
 * sources — `personio-auth-api.yaml` and `personio-personnel-data-api-oa3.yaml`, fetched
 * directly from `github.com/personio/api-docs`, which
 * `developer.personio.de/reference/introduction` itself names as the ground truth its
 * ReadMe pages are generated from — plus one ReadMe guide page for behavior the OpenAPI
 * files alone don't state. Nothing here came from a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The "client-credentials" grant is not standard OAuth2.** It's a plain
 *     `POST /v1/auth` with a JSON `{ client_id, client_secret }` body, no `grant_type`, no
 *     Basic-auth header — and the resulting token is STABLE for 24 hours, so repeated
 *     minting is wasted work against the auth endpoint's own separate 150/minute limit.
 *     See `lib/client.ts` and `auth/client-credentials.ts`.
 *  2. **Personio wraps field values inconsistently, even within one response.** An
 *     Employee resource wraps every field in `{ label, value, type, universal_id }`; a
 *     TimeOffPeriod's own top-level fields are plain scalars, EXCEPT the embedded
 *     `employee` relationship, which reverts to the full Employee wrapper. `lib/client.ts`
 *     ships two separate unwrappers (`flattenAttributes`, `flattenTimeOffPeriod`) because
 *     one generic function cannot cover both shapes correctly.
 *  3. **v1 Attendances and Projects are deprecated with no documented successor.** Both
 *     carry `deprecated: true` and a named `/v2/...` successor path, but that v2 surface
 *     is not documented anywhere in the same OpenAPI source. Per this app's own rule to
 *     leave out what can't be confirmed, neither is implemented — see the README.
 *
 * ## Deliberately not covered
 *
 * - **Attendances (v1) and Projects (v1)** — deprecated, no documented v2 replacement
 *   (see finding 3 above).
 * - **The Recruiting API** (`personio-recruiting-api.yaml`) — a genuinely separate
 *   contract: its own static "Recruiting API Access Token" (not minted from `/v1/auth`),
 *   a required `X-Company-ID` header the Personnel Data API never uses, and no documented
 *   read-only endpoint at all (only two mutating `POST`s), which leaves no safe probe for
 *   an Auth `test` hook. Out of scope for this pass.
 * - **The Career Site XML job-postings feed** (`{company}.jobs.personio.de/xml`) — a
 *   different, unauthenticated host with an XML (not JSON) response; left out to keep
 *   this app to a single host and a single response format.
 * - **Creating hourly absence periods** (`POST /company/absence-periods`) and
 *   **profile pictures** — real and documented, but left out of this pass; "List Absence
 *   Periods" already covers the read side.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import listEmployees from "./actions/list-employees.ts";
import getEmployee from "./actions/get-employee.ts";
import createEmployee from "./actions/create-employee.ts";
import updateEmployee from "./actions/update-employee.ts";
import listEmployeeAttributes from "./actions/list-employee-attributes.ts";
import getAbsenceBalance from "./actions/get-absence-balance.ts";

import listTimeOffTypes from "./actions/list-time-off-types.ts";
import listTimeOffs from "./actions/list-time-offs.ts";
import getTimeOff from "./actions/get-time-off.ts";
import createTimeOff from "./actions/create-time-off.ts";
import deleteTimeOff from "./actions/delete-time-off.ts";
import listAbsencePeriods from "./actions/list-absence-periods.ts";

import listDocumentCategories from "./actions/list-document-categories.ts";
import uploadDocument from "./actions/upload-document.ts";

import listCustomReports from "./actions/list-custom-reports.ts";
import getCustomReport from "./actions/get-custom-report.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Employees
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    listEmployeeAttributes,
    getAbsenceBalance,
    // Absences
    listTimeOffTypes,
    listTimeOffs,
    getTimeOff,
    createTimeOff,
    deleteTimeOff,
    listAbsencePeriods,
    // Documents
    listDocumentCategories,
    uploadDocument,
    // Custom Reports
    listCustomReports,
    getCustomReport,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
