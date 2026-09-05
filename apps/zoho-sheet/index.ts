/**
 * Zoho Sheet — spreadsheet workbooks/worksheets/rows/ranges, over the Zoho
 * Sheet Data API (`https://sheet.zoho.com/api/v2/...`, and its six regional
 * siblings).
 *
 * Every path, verb, parameter, response shape and error code in this app was
 * verified live 2026-09-05 against Zoho's own API Playground
 * (`https://www.zoho.com/sheet/help/api/v2/`) — specifically the JS data file
 * that page's UI actually renders from
 * (`zohowebstatic.com/.../js/node/sheet/21165-en.js`), which is the only
 * place the real operation catalog lives; the page's static banner text is
 * partly stale (see `lib/client.ts`) — plus direct unauthenticated probes
 * against every regional API host. Nothing here came from a third-party
 * integration directory.
 *
 * Scoped to **Zoho Sheet specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` and `zohodesk`, separate products with separate API
 * surfaces; do not confuse them.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The API host is `sheet.zoho.<tld>`, not the `docs.zoho.com` the
 *     Playground's own banner text names** (`lib/client.ts`). The banner is
 *     copy shared with Zoho Writer/Docs and was never updated for Sheet; the
 *     page's own JS (`defaultAPIUrl`) hardcodes `sheet.zoho.com`, and a live
 *     probe confirms only that host serves this API.
 *  2. **Seven data centres, not eight — there is no Canadian Sheet API host
 *     at all** (`lib/regions.ts`). `sheet.zoho.ca` fails DNS resolution
 *     outright, and the CRM/Books-style `www.zohoapis.ca/sheet/api/v2/`
 *     answers a real `404 API endpoint not found` rather than serving the
 *     API under a different host — a genuine product gap, not a naming
 *     mismatch like `zohobooks`' Canadian OAuth host.
 *  3. **Almost every operation is JSON-RPC-over-POST at one fixed path,
 *     `/api/v2/<resource_id>`** (`lib/client.ts`), with the actual operation
 *     named by a `method` form field (`worksheet.list`, `range.content.get`,
 *     ...) rather than by the URL — confirmed from the Playground's own
 *     generated curl sample, which is a `POST` even for read operations like
 *     `workbook.list`. Only `workbook.list` (`/api/v2/workbooks`) and
 *     `workbook.create` (`/api/v2/create`) address a different, fixed path,
 *     since they don't yet have a workbook to address.
 *  4. **The error envelope is flat and distinct from the success envelope**
 *     (`lib/client.ts`). A success answers `{"status":"success",...}`; a
 *     failure answers `{"error_message":...,"error_code":<number>}` with no
 *     `status` field at all. Zoho gives ONE code (`2401`) for both "no
 *     Authorization header" and "syntactically-present but dead token" —
 *     unlike Zoho Books' `14`/`57` split — so `auth/oauth2.ts`'s `test` hook
 *     can report that the credential doesn't work but not which way.
 *  5. **No quota surface exists** (`health/quota.ts`). Zoho Sheet documents a
 *     real per-method, per-minute call ceiling (with a 5-minute lockout once
 *     exceeded), but exposes no response header to probe headroom ahead of
 *     it — declared absent rather than guessed.
 *
 * Deliberately absent: tabular/"Data Store" table operations (a genuinely
 * different mental model — a worksheet as a database table with typed
 * criteria filters — that deserves its own design rather than a bolt-on),
 * pivot tables, charts, format/conditional-formatting, merge (mail-merge),
 * named ranges/data-validation/picklists, and workbook sharing/versioning/
 * publish/upload/download — none of those are core spreadsheet CRUD
 * automation, and several (tabular, pivot, charts) are large enough surfaces
 * to warrant their own action set later rather than a partial one now.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import workbookList from "./actions/workbook-list.ts";
import workbookCreate from "./actions/workbook-create.ts";

import sheetList from "./actions/sheet-list.ts";
import sheetCreate from "./actions/sheet-create.ts";
import sheetDelete from "./actions/sheet-delete.ts";

import sheetRead from "./actions/sheet-read.ts";
import sheetAppend from "./actions/sheet-append.ts";
import sheetWriteCsv from "./actions/sheet-write-csv.ts";
import sheetClear from "./actions/sheet-clear.ts";
import usedAreaGet from "./actions/used-area-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // workbooks
    workbookList,
    workbookCreate,
    // worksheets
    sheetList,
    sheetCreate,
    sheetDelete,
    // rows / ranges
    sheetRead,
    sheetAppend,
    sheetWriteCsv,
    sheetClear,
    usedAreaGet,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
