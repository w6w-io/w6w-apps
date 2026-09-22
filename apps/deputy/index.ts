/**
 * Deputy — employees, timesheets, leave, areas and locations, on whichever
 * install you run.
 *
 * Deputy is workforce management: rostering, time and attendance, and the
 * employee records underneath both. This app covers the loop a workflow
 * actually touches — clock someone on and off, write and read worked time,
 * keep employee records in step with another system, and pull the areas,
 * locations and leave requests those records point at.
 *
 * Every path, field name and payload here was read off Deputy's own
 * documentation on 2026-09-22 (`https://developer.deputy.com/`; append `.md` to
 * any page for its clean markdown version, `/llms.txt` for the full index) and
 * checked against live, unauthenticated probes of the install Deputy's own
 * guides use as their example, `simonssambos.au.deputy.com`.
 *
 * ## There is no vendor host — every customer gets their own subdomain
 *
 * *"Every Deputy customer runs on their own subdomain … the api endpoint is
 * https://simonssambos.au.deputy.com/api/"* — four regions, AU/EU/UK/US, and a
 * token bound to exactly one install. So the base URL is a Connection field and
 * the egress allowlist is `["*"]`, the posture this pack already uses for
 * `mautic`, `gitea`, `tableau` and `bubble`. It is deliberately wide, and it is
 * the price of an app whose server address only the operator knows. Nothing
 * else is reachable from an action: the one fixed host this app knows is
 * `status.deputy.com`, and that lives on the `service` health check's own hook
 * allowlist (`health/service.ts`), not on the app's.
 *
 * ## Auth: a Permanent Token, not OAuth2
 *
 * Deputy documents two ways in. The OAuth2 authorization-code flow needs a
 * browser and a consent screen and issues 24-hour tokens with rotating refresh
 * tokens — built for published apps serving "hundreds if not thousands" of
 * customers. A permanent token is what Deputy's own docs recommend for *"a
 * custom application for one or two Deputy installs or for an internal system
 * connection"*, which is exactly an unattended workflow, and it is what this
 * app implements. See `auth/permanent-token.ts` for the mints-it-once setup
 * path, the verified request/response classification, and what it deliberately
 * refuses to copy off a response body.
 *
 * ## V1, deliberately — and what that costs
 *
 * Deputy ships two API generations. This app stays on the V1 Resource API
 * (`/api/v1/...`), which Deputy's own generated reference describes as
 * *"legacy"* and *"in maintenance mode — new integrations should prefer the V2
 * API"*. V2 is a different surface: partly async, partly PKCE-token
 * authenticated, and not something a permanent token is the right credential
 * for. The README records V2 as a known gap.
 *
 * ## Four things that go wrong quietly
 *
 *   - **`Company` means Location.** Deputy's UI says "Location", every API
 *     surface says `Company`, and Deputy's own hand-written "Get Locations"
 *     page is literally `GET /v1/resource/Company`. The same split runs through
 *     `OperationalUnit` = "Area" and `Employee.Company` = the Location an
 *     employee belongs to.
 *   - **500 records is a cap, not a page size.** *"The maximum amount of records
 *     included in a single response is 500"* — a list action that returns
 *     exactly 500 has silently truncated, and the fix is `POST /QUERY`, which is
 *     why every large table here has a search action beside its list action.
 *   - **A `403` is not a missing endpoint.** Verified live: Deputy
 *     authenticates before it routes, so `GET /api/v1/nope-not-real` and
 *     `GET /api/v1/me` answer the *identical*
 *     `{"error":{"code":403,"message":"No authorization given"}}` when no token
 *     is sent. A 403 envelope proves an install answered; it proves nothing
 *     about whether the path exists.
 *   - **A wrong install URL is a redirect, not a 404.** A hostname that is not
 *     an install answers `302` to `once.deputy.com/my/` and lands on a 200 HTML
 *     login page, so a typo'd URL reads as "authenticated" to anything that
 *     only checks status codes. `auth/permanent-token.ts` checks the final host
 *     and the body instead.
 *
 * Deliberately out of scope: the V2 API (including the newer employee, shift,
 * payroll and PKCE surfaces), webhooks, DeXML, Deputy Embed, sales metrics,
 * payroll exports, the other ~40 V1 resources, and every write path Deputy
 * documents only as a hand-written recipe rather than in its generated
 * reference. Each is its own surface, and none of it is the daily loop a
 * scheduling workflow needs.
 */
import type { AppDefinition } from "@w6w/types";
import permanentToken from "./auth/permanent-token.ts";

import me from "./actions/me.ts";
import employeeList from "./actions/employee-list.ts";
import employeeGet from "./actions/employee-get.ts";
import employeeSearch from "./actions/employee-search.ts";
import employeeCreate from "./actions/employee-create.ts";
import employeeUpdate from "./actions/employee-update.ts";
import employeeFields from "./actions/employee-fields.ts";
import timesheetList from "./actions/timesheet-list.ts";
import timesheetGet from "./actions/timesheet-get.ts";
import timesheetSearch from "./actions/timesheet-search.ts";
import timesheetStart from "./actions/timesheet-start.ts";
import timesheetEnd from "./actions/timesheet-end.ts";
import timesheetCreateOrUpdate from "./actions/timesheet-create-or-update.ts";
import leaveList from "./actions/leave-list.ts";
import operationalUnitList from "./actions/operational-unit-list.ts";
import operationalUnitGet from "./actions/operational-unit-get.ts";
import locationList from "./actions/location-list.ts";
import locationGet from "./actions/location-get.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // who this token is
    me,
    // employees
    employeeList,
    employeeGet,
    employeeSearch,
    employeeCreate,
    employeeUpdate,
    employeeFields,
    // timesheets — reads first, then Deputy's documented write path
    timesheetList,
    timesheetGet,
    timesheetSearch,
    timesheetStart,
    timesheetEnd,
    timesheetCreateOrUpdate,
    // leave
    leaveList,
    // areas (OperationalUnit)
    operationalUnitList,
    operationalUnitGet,
    // locations (the Company resource)
    locationList,
    locationGet,
  ],
  auth: [permanentToken],
  healthChecks: [instance, service],
} satisfies AppDefinition;
