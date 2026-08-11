/**
 * Formstack — forms, fields, folders and submissions on the **Formstack V2025
 * API** (`www.formstack.com/api/v2025`).
 *
 * Every path and parameter was verified on 2026-08-11 against Formstack's own
 * documentation — `developers.formstack.com/llms.txt` and the per-endpoint `.md`
 * pages it indexes, each embedding that endpoint's OpenAPI fragment — plus live
 * probes against `www.formstack.com`. Nothing here came from a third-party
 * integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **This is V2025, not the older v2** (`lib/client.ts`). Both generations
 *     are live and both answer 401 to an unauthenticated call, so a credential
 *     for the wrong one presents as a rejected token rather than a wrong URL.
 *  2. **Pagination parameter names differ between endpoints**
 *     (`lib/client.ts`). `/forms` and the submissions endpoints take
 *     `pageNumber`/`pageSize`; `/folders` takes `page`/`perPage`. The wrong pair
 *     is ignored rather than rejected, so you get page one forever.
 *  3. **Submission answers are opt-in** (`actions/submission-list.ts`). Without
 *     `data=true` a submission is only metadata — this app defaults it on.
 *  4. **The status page belongs to a different brand**
 *     (`health/service.ts`). Formstack is now part of **Intellistack**;
 *     `status.formstack.com` is a catch-all that serves the same HTML for every
 *     path, and the readable page is `www.intellistackstatus.com`.
 *
 * The quota check is a declared absence: Formstack's limit is a **daily**
 * allowance per token that varies by plan, with no header to read — so a 429
 * means this token is finished until the window rolls, which the client says
 * rather than inviting a retry.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formFields from "./actions/form-fields.ts";
import folderList from "./actions/folder-list.ts";

import submissionList from "./actions/submission-list.ts";
import submissionCount from "./actions/submission-count.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionCreate from "./actions/submission-create.ts";
import submissionDelete from "./actions/submission-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // forms — where a form id and its field ids come from
    formList,
    formGet,
    formFields,
    folderList,
    // submissions
    submissionList,
    submissionCount,
    submissionGet,
    submissionCreate,
    submissionDelete,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
