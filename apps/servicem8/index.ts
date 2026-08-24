/**
 * ServiceM8 — field-service management for trades businesses: Jobs (Quotes,
 * Work Orders, Completed jobs), Clients, scheduling/dispatch, staff, and the
 * line items that make up a Job's Quote/Invoice — over ServiceM8's REST API
 * (`api.servicem8.com/api_1.0`).
 *
 * Every path, verb, field and enum in this app was verified on 2026-08-24
 * against ServiceM8's own OpenAPI 3.1 document (`info.title` "ServiceM8 API"),
 * fetched from the `api` payload embedded in every `/docs/reference*` page on
 * `developer.servicem8.com` — a ReadMe.io site whose `<script id="ssr-props">`
 * tag carries the same document, one server (`https://api.servicem8.com/api_1.0`),
 * 97 paths — together with the prose guides published beside it
 * (`getting-started`, `authentication`, `http-response-codes`, `filtering`,
 * `pagination`, `field-types`) and live probes against `api.servicem8.com`.
 * Nothing here came from a third-party integration directory.
 *
 * **Finding the reference was the non-obvious part.** The ReadMe.io HTML shell
 * is useless as-is: the page body renders client-side, and the doc text that
 * *does* arrive server-side is HTML-entity-mangled in a way that breaks a
 * naive `JSON.parse` — every literal quote inside a code sample or JSON
 * example is encoded as `&quot;` with its escaping backslash silently
 * stripped, so `\"` (an escaped quote inside a JSON string) becomes a bare
 * `&quot;` that decodes to an unescaped `"` and corrupts the JSON. The fix is
 * `&quot;` -> `\"` (restoring the backslash), not `&quot;` -> `"`.
 *
 * The findings that shaped this app, each documented in full where it matters:
 *
 *  1. **Create/update return no record data** (`lib/client.ts`). Both answer
 *     `{"errorCode":0,"message":"OK"}`; a new row's id comes back only in the
 *     `x-record-uuid` response *header*. Every create action here returns
 *     `{uuid}`, never a promise of the record's fields.
 *  2. **DELETE archives; it does not erase** (`lib/client.ts`,
 *     `actions/job-delete.ts`). The reference's own words: "successfully
 *     archived (soft deleted)" — `active` flips to `0`, the row and its
 *     history remain readable.
 *  3. **Pagination is a cursor, not a page number** (`lib/client.ts`).
 *     `cursor=-1` starts; the `x-next-cursor` response header (a UUID, not an
 *     offset) is the only way to the next page; its absence means "last page".
 *  4. **The OpenAPI document declares NO per-field query parameters** on any
 *     list operation this app calls (`parameters: []` on `listJobs`,
 *     `listClients`, …) even though every one of them carries the identical
 *     "This endpoint supports result filtering" note in its description. The
 *     generic `$filter`/`$sort`/`cursor` trio (`lib/params.ts`) is offered
 *     everywhere instead of inventing per-endpoint fields the reference never
 *     declares.
 *  5. **An API key has no scopes; OAuth2 does** (`auth/api-key.ts`). ~50
 *     fine-grained OAuth scopes exist, but every operation's `security` lists
 *     the bare `apiKey` scheme with an EMPTY scope requirement alongside them
 *     — a key is all-or-nothing.
 *  6. **The 401 body's shape depends on whether ANY credential was sent, not
 *     on whether it was right** (`lib/client.ts`, `auth/api-key.ts`,
 *     `health/api.ts`). No header at all -> plain-text `Authorization Required`
 *     (`content-type: text/html`). A well-formed-but-wrong `X-Api-Key` -> the
 *     documented JSON `{"errorCode":401,"message":"Authorization Required"}`.
 *     Same message text either way, so `test` cannot tell "never valid" from
 *     "revoked" apart even though the transport-level shape differs.
 *  7. **An undocumented HTTP Basic-Auth fallback is live** (`lib/client.ts`).
 *     The 401 carries `WWW-Authenticate: Basic realm="ServiceM8 API"`, and
 *     sending `Authorization: Basic base64(email:password)` gets a THIRD,
 *     distinct body (`Invalid username or password`) rather than being
 *     ignored — proving the gateway evaluates it. `authentication.md`
 *     documents only the API key and OAuth2 as current methods, so this app
 *     does not implement the Basic path.
 *  8. **No genuine status page exists** (`health/service.ts`). The guessable
 *     `servicem8.statuspage.io` is an unclaimed Atlassian Statuspage subdomain
 *     (302 to statuspage.io's own marketing site); `servicem8.freshstatus.io`
 *     answers 200 with Freshstatus's generic "page does not exist" catch page,
 *     not a real one.
 *
 * Two REST-vs-UI naming gaps worth knowing before reading a response:
 * `Company` is what the UI calls a Client/Customer, and `Attachment` is what
 * the UI calls a Quote, Invoice, Work Order document or Job-Diary photo — all
 * four are the same resource, distinguished by their own fields
 * (`rest-overview.md`'s own naming table). This app does not implement
 * Attachment upload: `AttachmentCreate`'s schema carries metadata fields only
 * (name, type, tags, …) with no field for the file's actual bytes, and the
 * reference does not document the separate mechanism a real upload needs — so
 * it is left out rather than guessed at.
 *
 * Every timestamp in this API (`job.date`, `jobactivity.start_date`, …) is in
 * the ACCOUNT'S OWN LOCAL TIMEZONE, format `YYYY-MM-DD HH:MM:SS`, no offset —
 * except Webhook payload timestamps, which `webhooks-overview.md` states are
 * UTC. OAuth2 (`docs/authentication.md`) is real and documented but requires
 * becoming a registered ServiceM8 Development Partner with a per-partner App
 * ID/Secret; it is not implemented here, since there is no way to verify that
 * flow end-to-end without one.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCreate from "./actions/job-create.ts";
import jobUpdate from "./actions/job-update.ts";
import jobDelete from "./actions/job-delete.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";

import jobActivityList from "./actions/jobactivity-list.ts";
import jobActivityCreate from "./actions/jobactivity-create.ts";

import jobMaterialList from "./actions/jobmaterial-list.ts";
import jobMaterialCreate from "./actions/jobmaterial-create.ts";

import noteCreate from "./actions/note-create.ts";
import staffList from "./actions/staff-list.ts";
import categoryList from "./actions/category-list.ts";
import queueList from "./actions/queue-list.ts";
import vendorGet from "./actions/vendor-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

export default {
  actions: [
    // Jobs
    jobList,
    jobGet,
    jobCreate,
    jobUpdate,
    jobDelete,
    // Clients (Company)
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    // Scheduling
    jobActivityList,
    jobActivityCreate,
    // Quote/Invoice line items
    jobMaterialList,
    jobMaterialCreate,
    // Notes and reference data
    noteCreate,
    staffList,
    categoryList,
    queueList,
    vendorGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api],
} satisfies AppDefinition;
