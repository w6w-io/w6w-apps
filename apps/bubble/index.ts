/**
 * Bubble — the Data API and Workflow API of a Bubble no-code application.
 *
 * Every path, parameter, request/response shape and error message documented
 * here was verified against `manual.bubble.io` 2026-09-01 —
 * `help-guides/integrations/api/the-bubble-api/*` (the long-form guide) and
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests` (the
 * short-form technical reference) — and, where the docs were silent or
 * disagreed with themselves, against a real, publicly reachable Bubble app
 * (`app.bubbleapps.io`) on the same date. See `lib/client.ts` for the exact
 * citations and `README.md` for what was left out and why.
 *
 * ## There is no vendor host
 *
 * Bubble is a no-code **app builder**, not a single hosted API: every Bubble
 * application is its own deployment with its own root URL
 * (`https://<appname>.bubbleapps.io`, or a connected custom domain) and its
 * own database schema. So, exactly like `gitea`, `mautic` and `tableau` in
 * this pack, the app's URL is a connection field rather than a fixed
 * hostname, and the egress allowlist is `["*"]`.
 *
 * ## Two APIs, one app
 *
 *   - **The Data API** (`/api/1.1/obj/...`) is direct CRUD on the app's own
 *     database, scoped to whichever Data Types the builder has checked on in
 *     Settings → API. `data-list`/`data-get`/`data-create`/`data-update`/
 *     `data-replace`/`data-delete`/`data-bulk-create` cover it.
 *   - **The Workflow API** (`/api/1.1/wf/...`) triggers a named, server-side
 *     "API Workflow" the builder has exposed — anything from creating a
 *     record to sending an email to running a whole custom process.
 *     `workflow-trigger` covers it, by name, since every app defines its own.
 *
 * ## What is deliberately left out
 *
 *   - **User-level authentication.** Bubble's other client identity — logging
 *     a specific end-user in through the app's own custom login workflow — has
 *     no fixed endpoint to call generically (see `auth/admin-token.ts`), so
 *     only the admin token method is implemented.
 *   - **Bulk update/delete, and the Swagger meta endpoint as an action.**
 *     Bubble documents no bulk PATCH/DELETE (only bulk create), and the
 *     `/api/1.1/meta/swagger.json` endpoint was confirmed live to answer
 *     identically with no token, a bad token, or a good one — it is not
 *     credential-gated, so it is not useful as an action or a credential
 *     probe, only as something a person reads once by hand.
 */
import type { AppDefinition } from "@w6w/types";
import adminToken from "./auth/admin-token.ts";

import dataList from "./actions/data-list.ts";
import dataGet from "./actions/data-get.ts";
import dataCreate from "./actions/data-create.ts";
import dataUpdate from "./actions/data-update.ts";
import dataReplace from "./actions/data-replace.ts";
import dataDelete from "./actions/data-delete.ts";
import dataBulkCreate from "./actions/data-bulk-create.ts";
import workflowTrigger from "./actions/workflow-trigger.ts";

import service from "./health/service.ts";
import app from "./health/app.ts";

export default {
  actions: [
    // data api
    dataList,
    dataGet,
    dataCreate,
    dataUpdate,
    dataReplace,
    dataDelete,
    dataBulkCreate,
    // workflow api
    workflowTrigger,
  ],
  auth: [adminToken],
  healthChecks: [service, app],
} satisfies AppDefinition;
