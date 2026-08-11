/**
 * Baserow — rows, batches and schema discovery against a Baserow instance's REST
 * API (`<site>/api/database/…`), on Baserow Cloud **and** self-hosted installs
 * alike.
 *
 * Every path, verb, body field and enum in this app was verified against
 * Baserow's own OpenAPI document on 2026-08-10 —
 * `https://api.baserow.io/api/schema.json`, OpenAPI 3.0.3, "Baserow API spec"
 * **v2.3.3**, 6.0 MB, 293 paths — plus live probes against `api.baserow.io`.
 * Nothing here came from a third-party integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **There is no vendor host — the instance is the host** (`lib/client.ts`).
 *     Baserow's spec declares no `servers` block, so the URL is an Auth field
 *     and the manifest allows `*`.
 *  2. **The header is `Authorization: Token …`, not `Bearer`**
 *     (`auth/database-token.ts`), and this app is deliberately database-token
 *     only — a JWT would need a network call `sign` cannot make, and a human's
 *     password.
 *  3. **`user_field_names` is what makes the API legible** (`lib/client.ts`).
 *     Off, rows are keyed `field_4321`; on, by the field's name. Every row
 *     action defaults it on.
 *  4. **The status page needed three tries** (`health/service.ts`):
 *     `status.baserow.io` does not resolve, `status.baserow.org` serves the same
 *     483 KB of HTML for every Statuspage-shaped path, and
 *     `baserow.instatus.com` is a superseded page that still answers. The one
 *     real feed is `status.baserow.org/index.json`.
 */
import type { AppDefinition } from "@w6w/types";
import databaseToken from "./auth/database-token.ts";

import tableList from "./actions/table-list.ts";
import fieldList from "./actions/field-list.ts";

import rowList from "./actions/row-list.ts";
import rowGet from "./actions/row-get.ts";
import rowCreate from "./actions/row-create.ts";
import rowUpdate from "./actions/row-update.ts";
import rowDelete from "./actions/row-delete.ts";
import rowMove from "./actions/row-move.ts";
import rowNames from "./actions/row-names.ts";

import rowsCreateBatch from "./actions/rows-create-batch.ts";
import rowsUpdateBatch from "./actions/rows-update-batch.ts";
import rowsDeleteBatch from "./actions/rows-delete-batch.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // discovery — where a Table ID comes from
    tableList,
    fieldList,
    // rows
    rowList,
    rowGet,
    rowCreate,
    rowUpdate,
    rowDelete,
    rowMove,
    rowNames,
    // batches, capped at 200 items by the vendor
    rowsCreateBatch,
    rowsUpdateBatch,
    rowsDeleteBatch,
  ],
  // Database token only. Baserow's other credential is a JWT from an email and
  // password, which `sign` cannot fetch and which expires — see
  // auth/database-token.ts for the full reasoning.
  auth: [databaseToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
