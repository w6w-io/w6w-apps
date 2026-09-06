/**
 * Glide — the no-code app builder. This app covers the one surface Glide's
 * public API actually exposes: Big Tables, Glide's large-capacity cloud data
 * type, over the classic Glide API (`api.glideapps.com`).
 *
 * Every path, header, query parameter, body field and error code here was
 * verified on 2026-09-06 against Glide's own OpenAPI 3.1 document
 * (`www.glideapps.com/docs/openapi.json`, 69,411 bytes, 14 operations across
 * `/tables`, `/stashes`, `/jobs` and `/apps/{appID}/uploads`) plus the prose
 * pages it links to (`docs/classic-api/general/authentication`, `.../errors`,
 * `.../limits`, `docs/classic-api/stashing/introduction`,
 * `docs/classic-api/tables/data-versioning`) and live probes against
 * `api.glideapps.com` and `status.glideapps.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The three findings that shaped the design:
 *
 *  1. **This API only ever sees Big Tables** (`lib/client.ts`). `GET /tables`'s
 *     own description: "No other table types will be included in the
 *     response, even though they are part of your Glide team." The
 *     spreadsheet-backed tables most Glide apps are actually built on
 *     (Google Sheets, Airtable, the builder's own "Glide Tables" feature) are
 *     invisible to this app — there is no endpoint for them.
 *  2. **An invalid auth token answers `404`, not `401`** (`auth/api-token.ts`).
 *     Documented explicitly on Glide's own errors page. The credential probe
 *     classifies by the response body's `error.type`, never by status code.
 *  3. **The file-upload flow has a middle step this app cannot perform**
 *     (`actions/upload-create.ts`). `uploadLocation` is a pre-signed URL on
 *     Glide's storage provider, not `api.glideapps.com` — an address this
 *     app's manifest cannot enumerate in `network.allow` ahead of time. This
 *     app only ever orchestrates the two Glide-API calls that bracket that
 *     PUT; the byte upload itself is left to a plain HTTP request step.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import tableList from "./actions/table-list.ts";
import tableCreate from "./actions/table-create.ts";
import tableOverwrite from "./actions/table-overwrite.ts";

import rowsList from "./actions/rows-list.ts";
import rowsVersionGet from "./actions/rows-version-get.ts";
import rowGet from "./actions/row-get.ts";
import rowsAdd from "./actions/rows-add.ts";
import rowUpdate from "./actions/row-update.ts";
import rowDelete from "./actions/row-delete.ts";

import jobStatusGet from "./actions/job-status-get.ts";

import stashData from "./actions/stash-data.ts";
import stashDelete from "./actions/stash-delete.ts";

import uploadCreate from "./actions/upload-create.ts";
import uploadComplete from "./actions/upload-complete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Tables
    tableList,
    tableCreate,
    tableOverwrite,
    // Rows
    rowsList,
    rowsVersionGet,
    rowGet,
    rowsAdd,
    rowUpdate,
    rowDelete,
    // Jobs
    jobStatusGet,
    // Stashing
    stashData,
    stashDelete,
    // Uploads
    uploadCreate,
    uploadComplete,
  ],
  // API auth token only. Glide publishes no OAuth surface for third-party
  // integrations — the team-scoped token from the Data Editor is the whole
  // authentication story.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
