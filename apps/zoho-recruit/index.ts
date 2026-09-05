/**
 * Zoho Recruit — w6w app.
 *
 * Applicant tracking, over the Zoho Recruit REST API
 * (`https://recruit.zoho.com/recruit/v2/...`, and its nine regional
 * siblings). Every path, verb, query parameter, body field and error shape in
 * this app was verified on 2026-09-05 against Zoho's own documentation
 * (`https://www.zoho.com/recruit/developer-guide/apiv2/` — modules-api,
 * get-records, insert-records, update-records, delete-records,
 * search-records, change-status, notes, get-users, oauth-overview, multi-dc,
 * limits) and live probes against all ten regional API hosts and their
 * accounts hosts. Nothing here came from a third-party integration
 * directory.
 *
 * Scoped to **Zoho Recruit specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` and `zohodesk`, separate products with separate API
 * surfaces; do not confuse them.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The vendor's own "Multi DC" doc page is wrong AND incomplete**
 *     (`lib/regions.ts`). It tells readers to address non-US regions at
 *     `www.zohoapis.<tld>/recruit/v2/...` — live, every one of those answers
 *     a generic `404 API endpoint not found`, not Recruit's structured error
 *     shape. The real host is `recruit.zoho.<tld>` directly (like
 *     `zohodesk`'s `desk.zoho.<tld>`, unlike `zoho`/`zohobooks`'
 *     `www.zohoapis.<tld>` gateway). The same page also lists only 6 data
 *     centres; live probing found 10 — the same set `zohodesk` documents,
 *     four more than this page names (Saudi Arabia, Canada, Singapore, UAE).
 *  2. **Canada's accounts host does not follow the API host's naming
 *     pattern** (`lib/regions.ts`), exactly as `zohobooks`/`zohodesk` already
 *     document for their own Canadian entries: `recruit.zohocloud.ca`
 *     resolves and answers the real API; `recruit.zoho.ca` and
 *     `accounts.zoho.ca` both fail to resolve at all; the real OAuth host is
 *     `accounts.zohocloud.ca`.
 *  3. **`fields` is optional on Get Records — unlike identically-shaped Zoho
 *     CRM, which 400s without it** (`lib/client.ts`, `lib/params.ts`). Every
 *     list/get/search action here works with no field list typed in.
 *  4. **Search lives under its own OAuth scope, `ZohoRecruit.search.READ`**
 *     (`auth/oauth2.ts`) — separate from the `modules` scope family every
 *     other action here uses. A client scoped only to `modules.ALL` will
 *     401 on `search-records` and every module's search-by-criteria call.
 *  5. **Change Status nests its response one level deeper than every other
 *     write endpoint** (`lib/client.ts#unwrapStatusResult`): `{"data":
 *     [[{code,...}]]}`, an array of arrays, not the flat `{"data":
 *     [{code,...}]}` insert/update/delete/notes all share.
 *  6. **No quota surface exists** (`health/quota.ts`). Zoho Recruit documents
 *     a real 24-hour rolling credit system and its per-call costs, but
 *     exposes no `X-RateLimit-*` (or equivalent) response header to probe
 *     headroom ahead of a 429 — declared absent rather than guessed.
 *
 * Deliberately absent: Bulk Read/Write (a separate asynchronous job-based
 * surface), file/attachment upload (multipart), and blueprint/approval-process
 * actions — none of those are core CRUD-and-status workflow automation.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import candidateList from "./actions/candidate-list.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import candidateDelete from "./actions/candidate-delete.ts";
import candidateStatusChange from "./actions/candidate-status-change.ts";

import jobOpeningList from "./actions/job-opening-list.ts";
import jobOpeningGet from "./actions/job-opening-get.ts";
import jobOpeningCreate from "./actions/job-opening-create.ts";
import jobOpeningUpdate from "./actions/job-opening-update.ts";
import jobOpeningDelete from "./actions/job-opening-delete.ts";
import jobOpeningStatusChange from "./actions/job-opening-status-change.ts";

import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";
import clientDelete from "./actions/client-delete.ts";

import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";

import searchRecords from "./actions/search-records.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // candidate
    candidateList,
    candidateGet,
    candidateCreate,
    candidateUpdate,
    candidateDelete,
    candidateStatusChange,
    // job opening
    jobOpeningList,
    jobOpeningGet,
    jobOpeningCreate,
    jobOpeningUpdate,
    jobOpeningDelete,
    jobOpeningStatusChange,
    // client
    clientList,
    clientGet,
    clientCreate,
    clientUpdate,
    clientDelete,
    // note
    noteList,
    noteCreate,
    noteUpdate,
    noteDelete,
    // search
    searchRecords,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
