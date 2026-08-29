/**
 * CloudConvert — file conversion via a job/task pipeline over the CloudConvert API v2
 * (`api.cloudconvert.com` / `sync.api.cloudconvert.com`).
 *
 * Every path, verb, query parameter, body field and status code in this app was verified
 * on 2026-08-29 against CloudConvert's own documentation
 * (`cloudconvert.com/docs/getting-started/introduction`, `.../api-reference/jobs`,
 * `.../api-reference/tasks`, `.../api-reference/users`, `.../api-reference/webhooks`,
 * `.../api-reference/operations`, `.../import-export/import-files`,
 * `.../import-export/export-files`, `.../operations/convert-files`) plus live probes
 * against `api.cloudconvert.com`, `sync.api.cloudconvert.com` and
 * `status.cloudconvert.com`. Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Two hosts, same paths, different contract** (`lib/client.ts`). The synchronous
 *     host blocks a request until the job/task is terminal, with no documented timeout
 *     of its own — CloudConvert instead warns your network stack may time out first.
 *     `convert-url` and `job-create-and-wait` use it deliberately.
 *  2. **No scope-agnostic probe** (`auth/api-token.ts`). CloudConvert's six independent
 *     API-key scopes have no "whoami" outside every resource, unlike Apify's
 *     `/v2/users/me/limits`. The auth probe picks `task.read` — what nearly every action
 *     here needs — and says so when a differently-scoped key fails it.
 *  3. **No `import/upload` action** (`actions/convert-url.ts`). Uploading local file bytes
 *     is a two-step multipart flow, and this app's sandbox coerces every `ctx.fetch` body
 *     to a string — the same constraint this pack's `box` and `documenso` apps document.
 *     Every action here works with files already reachable by URL or through
 *     CloudConvert's own cloud-storage import/export operations instead.
 *  4. **A webhook's `signing_secret` is meant to come back on read** (`webhook-create.ts`,
 *     `webhook-list.ts`) — unlike Apify's `proxy.password`, this is the documented way to
 *     retrieve it, not something to strip.
 *  5. **The vendor's own `redirect` parameter is incompatible with this app's egress
 *     allowlist** (`job-get.ts`, `job-wait.ts`, `job-create-and-wait.ts`): it 302s to
 *     `storage.cloudconvert.com`, an undeclared host, with the raw output file as the
 *     body — not JSON an action could return anyway.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import jobCreate from "./actions/job-create.ts";
import jobCreateAndWait from "./actions/job-create-and-wait.ts";
import convertUrl from "./actions/convert-url.ts";
import jobGet from "./actions/job-get.ts";
import jobWait from "./actions/job-wait.ts";
import jobList from "./actions/job-list.ts";
import jobDelete from "./actions/job-delete.ts";

import taskGet from "./actions/task-get.ts";
import taskWait from "./actions/task-wait.ts";
import taskList from "./actions/task-list.ts";
import taskCancel from "./actions/task-cancel.ts";
import taskRetry from "./actions/task-retry.ts";
import taskDelete from "./actions/task-delete.ts";

import operationList from "./actions/operation-list.ts";
import userGet from "./actions/user-get.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Convert
    convertUrl,
    // Jobs
    jobCreate,
    jobCreateAndWait,
    jobGet,
    jobWait,
    jobList,
    jobDelete,
    // Tasks
    taskGet,
    taskWait,
    taskList,
    taskCancel,
    taskRetry,
    taskDelete,
    // Operations
    operationList,
    // Account
    userGet,
    // Webhooks
    webhookCreate,
    webhookList,
    webhookDelete,
  ],
  // API key only. CloudConvert also supports OAuth 2.0 authorization-code/implicit
  // grants for building multi-tenant apps on users' behalf, but every action here
  // authenticates as the connecting account itself, so a bearer API key — CloudConvert's
  // own recommended path for that case — is the whole authentication story.
  auth: [apiToken],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
