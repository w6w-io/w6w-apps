/**
 * Apollo — sales intelligence and engagement platform: search and enrich people and
 * companies, and manage the CRM-style records (contacts, accounts, deals) and outreach
 * machinery (sequences, tasks, lists) built on top of them, over the Apollo REST API v1
 * (`api.apollo.io/api/v1`).
 *
 * Every path, verb, query/body field and enum in this app was verified on 2026-08-29
 * against Apollo's own OpenAPI 3.1 document — embedded inline in every
 * `docs.apollo.io/reference/*` page as `document.api.schema` (74 paths, `info.version`
 * `1.0`) — plus live probes against `api.apollo.io` and `status.apollo.io` on the same
 * day. Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Search endpoints take their filters as QUERY parameters, not a JSON body, even
 *     though they are `POST`** — including array filters in Rails-style bracket
 *     notation (`person_titles[]=CEO`). See `lib/client.ts`.
 *  2. **Three error shapes for the same failure, by status code**: 401 is a plain-text
 *     body with no JSON at all; 422 is `{"error": "..."}`; 429 is `{"message": "..."}`.
 *     See `lib/client.ts` and `formatApolloError`.
 *  3. **The documented `auth/health` endpoint is not a usable probe.** It answers `200
 *     {"healthy":true}` for both no credential and a fake one — see `auth/api-key.ts`
 *     for the endpoint used instead, `GET /users/api_profile`.
 *  4. **`people-search` and `organization-search` are two different products.** The
 *     first costs 0 credits, never returns an email/phone, and returns obfuscated names;
 *     the second returns full records and costs 1 credit per page. Confusing the two is
 *     the easiest way to either leak nothing or spend credits by surprise.
 *  5. **Rate limits are real, per-team, per-endpoint, and self-reporting** via
 *     `x-rate-limit-*`/`x-*-usage`/`x-*-requests-left` headers on every authenticated
 *     response — see `health/request-rate.ts`.
 *  6. **`GET /labels` (the "Lists" feature) returns a bare JSON array**, unlike every
 *     other list endpoint's `{"resource": [...], "pagination": {...}}` shape. See
 *     `actions/list-list.ts`.
 *  7. **`account-create` applies NO deduplication** (a second call with the same name/
 *     domain always makes a second account), while `contact-create` optionally does via
 *     `run_dedupe`. Easy to assume the two behave the same way; they don't.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import peopleEnrich from "./actions/people-enrich.ts";
import peopleBulkEnrich from "./actions/people-bulk-enrich.ts";
import organizationEnrich from "./actions/organization-enrich.ts";
import organizationBulkEnrich from "./actions/organization-bulk-enrich.ts";
import peopleSearch from "./actions/people-search.ts";
import organizationSearch from "./actions/organization-search.ts";
import organizationJobPostingsList from "./actions/organization-job-postings-list.ts";

import accountCreate from "./actions/account-create.ts";
import accountUpdate from "./actions/account-update.ts";
import accountGet from "./actions/account-get.ts";
import accountSearch from "./actions/account-search.ts";
import accountStageList from "./actions/account-stage-list.ts";
import organizationGet from "./actions/organization-get.ts";

import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactStageUpdate from "./actions/contact-stage-update.ts";
import contactStageList from "./actions/contact-stage-list.ts";

import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealGet from "./actions/deal-get.ts";
import dealList from "./actions/deal-list.ts";
import dealStageList from "./actions/deal-stage-list.ts";

import sequenceCreate from "./actions/sequence-create.ts";
import sequenceUpdate from "./actions/sequence-update.ts";
import sequenceSearch from "./actions/sequence-search.ts";
import sequenceAddContacts from "./actions/sequence-add-contacts.ts";
import sequenceRemoveContacts from "./actions/sequence-remove-contacts.ts";
import sequenceActivityList from "./actions/sequence-activity-list.ts";

import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskGet from "./actions/task-get.ts";
import taskSearch from "./actions/task-search.ts";
import taskComplete from "./actions/task-complete.ts";
import taskSkip from "./actions/task-skip.ts";

import listCreate from "./actions/list-create.ts";
import listUpdate from "./actions/list-update.ts";
import listList from "./actions/list-list.ts";
import listAddRecords from "./actions/list-add-records.ts";
import listRemoveRecords from "./actions/list-remove-records.ts";

import userProfileGet from "./actions/user-profile-get.ts";
import usageStatsGet from "./actions/usage-stats-get.ts";
import creditUsageStatsGet from "./actions/credit-usage-stats-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Search & enrichment
    peopleEnrich,
    peopleBulkEnrich,
    organizationEnrich,
    organizationBulkEnrich,
    peopleSearch,
    organizationSearch,
    organizationJobPostingsList,
    // Accounts (+ database organizations)
    accountCreate,
    accountUpdate,
    accountGet,
    accountSearch,
    accountStageList,
    organizationGet,
    // Contacts
    contactCreate,
    contactUpdate,
    contactGet,
    contactSearch,
    contactStageUpdate,
    contactStageList,
    // Deals
    dealCreate,
    dealUpdate,
    dealGet,
    dealList,
    dealStageList,
    // Sequences
    sequenceCreate,
    sequenceUpdate,
    sequenceSearch,
    sequenceAddContacts,
    sequenceRemoveContacts,
    sequenceActivityList,
    // Tasks
    taskCreate,
    taskUpdate,
    taskGet,
    taskSearch,
    taskComplete,
    taskSkip,
    // Lists
    listCreate,
    listUpdate,
    listList,
    listAddRecords,
    listRemoveRecords,
    // Account / usage
    userProfileGet,
    usageStatsGet,
    creditUsageStatsGet,
  ],
  // API key only. Apollo's OAuth 2.0 flow is for partners acting on behalf of a mutual
  // user's own account, not for a workspace connecting its own — see auth/api-key.ts.
  auth: [apiKey],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
