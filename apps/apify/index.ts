/**
 * Apify — the web-scraping and automation platform: run Actors and tasks, poll
 * the runs they create, and read or write the datasets and key-value stores
 * those runs produce, over the Apify API v2 (`api.apify.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Apify's own OpenAPI 3.1 document
 * (`docs.apify.com/api/openapi.json`, 999,786 bytes, `info.version`
 * `v2-2026-08-05T133145Z`) plus live probes against `api.apify.com` and
 * `status.apify.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Ordinary reads return live credentials** (`lib/client.ts`,
 *     `actions/account-get.ts`, `actions/dataset-get.ts`). `GET /v2/users/me`
 *     returns `proxy.password`, the account's Apify Proxy credential; a dataset
 *     or key-value store returns `urlSigningSecretKey`, the HMAC key that mints
 *     public links to private data. All three are deleted before an Action
 *     returns, and none of them is the health probe.
 *  2. **The probe is `/v2/users/me/limits`** (`auth/api-token.ts`). It is the
 *     one endpoint that requires a credential, is reachable by the narrowest
 *     usable *scoped* token, and returns nothing secret — where `/v2/store`
 *     answers 200 with no credential at all and `/v2/datasets` is exactly what a
 *     scoped token may legitimately be refused.
 *  3. **Three response shapes, not one** (`lib/client.ts`). Most endpoints
 *     answer `{"data": …}`, but dataset items answer a bare array, key-value
 *     records answer the stored value under its own content type, and run logs
 *     answer `text/plain`.
 *  4. **Vendor list defaults are enormous** (`lib/params.ts`). `limit` defaults
 *     to its 1,000 maximum on the resource lists and is *unbounded* on dataset
 *     items — `GET /v2/store` with the vendor default returns 3.8 MB, measured.
 *     Every list action here prefills a small limit and says so.
 *
 * Two spellings of the same states coexist in this API and neither is wrong:
 * run statuses hyphenate (`TIMED-OUT`), webhook event types underscore
 * (`ACTOR.RUN.TIMED_OUT`).
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import actorList from "./actions/actor-list.ts";
import actorGet from "./actions/actor-get.ts";
import actorRun from "./actions/actor-run.ts";
import actorRunSyncGetItems from "./actions/actor-run-sync-get-items.ts";
import storeSearch from "./actions/store-search.ts";

import runList from "./actions/run-list.ts";
import runGet from "./actions/run-get.ts";
import runAbort from "./actions/run-abort.ts";
import runResurrect from "./actions/run-resurrect.ts";
import runLogGet from "./actions/run-log-get.ts";
import runDatasetItemsGet from "./actions/run-dataset-items-get.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskRun from "./actions/task-run.ts";
import taskRunSyncGetItems from "./actions/task-run-sync-get-items.ts";

import datasetList from "./actions/dataset-list.ts";
import datasetGet from "./actions/dataset-get.ts";
import datasetCreate from "./actions/dataset-create.ts";
import datasetItemsGet from "./actions/dataset-items-get.ts";
import datasetItemsPush from "./actions/dataset-items-push.ts";

import keyValueStoreList from "./actions/key-value-store-list.ts";
import keyValueStoreGet from "./actions/key-value-store-get.ts";
import keyValueStoreKeysList from "./actions/key-value-store-keys-list.ts";
import recordGet from "./actions/record-get.ts";
import recordSet from "./actions/record-set.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import accountGet from "./actions/account-get.ts";
import accountLimitsGet from "./actions/account-limits-get.ts";
import accountUsageGet from "./actions/account-usage-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Actors
    actorList,
    actorGet,
    actorRun,
    actorRunSyncGetItems,
    storeSearch,
    // Runs
    runList,
    runGet,
    runAbort,
    runResurrect,
    runLogGet,
    runDatasetItemsGet,
    // Tasks
    taskList,
    taskGet,
    taskRun,
    taskRunSyncGetItems,
    // Datasets
    datasetList,
    datasetGet,
    datasetCreate,
    datasetItemsGet,
    datasetItemsPush,
    // Key-value stores
    keyValueStoreList,
    keyValueStoreGet,
    keyValueStoreKeysList,
    recordGet,
    recordSet,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
    // Account
    accountGet,
    accountLimitsGet,
    accountUsageGet,
  ],
  // API token only. Apify publishes no OAuth surface for third-party apps; the
  // token is the whole authentication story, and Apify's own guidance for a
  // third-party integration is to hand it a *scoped* token.
  auth: [apiToken],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
