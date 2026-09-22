/**
 * Qualtrics — the survey and experience-management (XM) platform: read the
 * surveys and contact pools in an account, and export the responses they
 * collect, over the Qualtrics REST API v3.
 *
 * Every path, verb and body field in this app was verified on 2026-09-22 by
 * calling the live production API directly, unauthenticated. That is possible
 * and safe — no data is exposed — and it is the method to trust here, because
 * Qualtrics' own docs site is a client-rendered SPA whose sub-pages return a
 * generic 404 to a plain HTTP client. The method: an unauthenticated request to
 * a REAL route hits the auth check first and answers `400 ATP_2` / `401 DCD_7`
 * in Qualtrics' envelope, while a request to a route that does not exist answers
 * a different `404` body. The `400`-vs-`404` split is how every path below was
 * confirmed before an action was written against it.
 *
 * Three findings shape the design:
 *
 *  1. **The host is per-account** (`lib/client.ts`, `auth/api-token.ts`).
 *     Qualtrics is datacenter-sharded — `iad1`, `fra1`, `syd1`, `yul1`, `ca1`,
 *     `gov1`, … — so `w6w.network.allow` declares the wildcard
 *     `*.qualtrics.com`, and the datacenter id is a connect-time field recorded
 *     on the connection's redacted `display`.
 *  2. **The envelope is always `{meta, result}`** and failures are classified
 *     from `meta.error.errorCode` / `errorMessage` in the body, never from the
 *     status — Qualtrics already uses two different statuses (400 for a missing
 *     credential, 401 for an invalid one) for two different problems.
 *  3. **Pagination follows a URL, not an offset** (`lib/params.ts`). A list
 *     response carries `result.nextPage`, a full URL, and every list action
 *     follows it verbatim up to `maxPages`.
 *
 * Deliberately absent: anything that writes to the account. Qualtrics'
 * create/update/delete surface is large and none of it was verified, and the
 * app's real value is the read-and-export path below.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

// Surveys
import surveyList from "./actions/survey-list.ts";
import surveyGet from "./actions/survey-get.ts";
import distributionList from "./actions/distribution-list.ts";

// Response exports — the start / poll / download flow
import responseExportStart from "./actions/response-export-start.ts";
import responseExportStatus from "./actions/response-export-status.ts";
import responseExportFileGet from "./actions/response-export-file-get.ts";

// XM Directory contacts
import directoryList from "./actions/directory-list.ts";
import directoryContactList from "./actions/directory-contact-list.ts";
import directoryContactGet from "./actions/directory-contact-get.ts";

// Mailing lists
import mailingListList from "./actions/mailing-list-list.ts";
import mailingListContactList from "./actions/mailing-list-contact-list.ts";

// Libraries and administration
import libraryList from "./actions/library-list.ts";
import userList from "./actions/user-list.ts";
import organizationGet from "./actions/organization-get.ts";
import eventSubscriptionList from "./actions/event-subscription-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Surveys
    surveyList,
    surveyGet,
    distributionList,
    // Response exports
    responseExportStart,
    responseExportStatus,
    responseExportFileGet,
    // XM Directory contacts
    directoryList,
    directoryContactList,
    directoryContactGet,
    // Mailing lists
    mailingListList,
    mailingListContactList,
    // Libraries and administration
    libraryList,
    userList,
    organizationGet,
    eventSubscriptionList,
  ],
  // A static API token in the `X-API-TOKEN` header. Qualtrics publishes no
  // OAuth surface for third-party apps, so the token is the whole auth story;
  // the datacenter id travels with it because it selects the account's host.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
