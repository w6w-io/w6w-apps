/**
 * Greenhouse — the applicant tracking system: read candidates, applications,
 * jobs, interviews, scorecards and offers, and write back the moves, rejections
 * and hires that drive them, over the **Harvest v3 API**
 * (`harvest.greenhouse.io/v3`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Greenhouse's own OpenAPI 3.1 document for
 * Harvest v3 (`info.version` `v3`, 134 paths / 185 operations), the prose guides
 * on `harvestdocs.greenhouse.io`, the v1/v2 reference on
 * `developers.greenhouse.io`, and live probes of `harvest.greenhouse.io`,
 * `auth.greenhouse.io` and `status.greenhouse.io`. Nothing here came from a
 * third-party integration directory.
 *
 * **Greenhouse ships several separate APIs. This app is Harvest only** — not the
 * Job Board API, the Ingestion API, Onboarding, the Assessment API, the Audit Log
 * API, or either webhook surface. See `README.md`.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **v1 has a removal date and v3 is not a rename** (`lib/client.ts`). The
 *     v1/v2 reference carries the banner "The Harvest v1/v2 API is deprecated
 *     and will be removed on August 31, 2026." So this app calls `/v3`
 *     exclusively — a different auth model, different pagination, different
 *     response envelope, different endpoints.
 *  2. **Two ways in, one of which also expires** (`auth/`). The durable path is
 *     OAuth 2.0 client credentials at `auth.greenhouse.io`, self-serve from
 *     Greenhouse's API Credentials screen. The other exchanges an existing v1/v2
 *     Harvest API key for a v3 token at `harvest.greenhouse.io/auth/token` — a
 *     transition endpoint Greenhouse says it will retire together with v1/v2.
 *     Both end up sending the same v3 bearer token.
 *  3. **A list response is a bare array and the cursor is a header**
 *     (`lib/client.ts`). No envelope, no total, no page metadata in the body —
 *     paging is the RFC 5988 `Link` header, and a cursor must travel as the
 *     *only* query parameter or the request is a 422.
 *  4. **`status` on an application means two different things**
 *     (`lib/params.ts`). You filter for `active`; every row comes back saying
 *     `in_process`. Note visibility has the same split in the other direction
 *     (`publicly_visible` on the way out, `public` on the way in).
 *  5. **A 403 is a normal state, not a broken credential** (`auth/token.ts`).
 *     v3 authorises in two layers — the JWT must decode, and the granted scopes
 *     plus the acting Greenhouse user must cover the call, where every v3 GET
 *     additionally requires a **Site Admin** subject. A perfectly live
 *     credential answers 403 on endpoints outside its grant, so `test` treats
 *     that as a pass.
 *
 * And one thing that is easy to get backwards: **v3 routes before it
 * authenticates, v1 does the opposite.** On v1 a nonsense path answers the same
 * 401 as a real one; on v3 it answers 404. That is what makes the unsigned
 * `health/api.ts` probe able to tell "the endpoint was removed" from "your
 * credential is wrong".
 */
import type { AppDefinition } from "@w6w/types";

import oauthClientCredentials from "./auth/oauth-client-credentials.ts";
import apiKey from "./auth/api-key.ts";

import listCandidates from "./actions/list-candidates.ts";
import listApplications from "./actions/list-applications.ts";
import listApplicationStages from "./actions/list-application-stages.ts";
import listAttachments from "./actions/list-attachments.ts";
import listNotes from "./actions/list-notes.ts";

import listJobs from "./actions/list-jobs.ts";
import listJobPosts from "./actions/list-job-posts.ts";
import listJobInterviewStages from "./actions/list-job-interview-stages.ts";
import listOpenings from "./actions/list-openings.ts";

import listInterviews from "./actions/list-interviews.ts";
import listScorecards from "./actions/list-scorecards.ts";
import listOffers from "./actions/list-offers.ts";

import listUsers from "./actions/list-users.ts";
import listDepartments from "./actions/list-departments.ts";
import listOffices from "./actions/list-offices.ts";
import listSources from "./actions/list-sources.ts";
import listRejectionReasons from "./actions/list-rejection-reasons.ts";

import createCandidate from "./actions/create-candidate.ts";
import updateCandidate from "./actions/update-candidate.ts";
import createApplication from "./actions/create-application.ts";
import createNote from "./actions/create-note.ts";
import moveApplication from "./actions/move-application.ts";
import rejectApplication from "./actions/reject-application.ts";
import hireApplication from "./actions/hire-application.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import silo from "./health/silo.ts";

export default {
  actions: [
    // Candidates and their applications
    listCandidates,
    listApplications,
    listApplicationStages,
    listAttachments,
    listNotes,
    // Jobs
    listJobs,
    listJobPosts,
    listJobInterviewStages,
    listOpenings,
    // Interviewing and offers
    listInterviews,
    listScorecards,
    listOffers,
    // Organisation reference data
    listUsers,
    listDepartments,
    listOffices,
    listSources,
    listRejectionReasons,
    // Writes
    createCandidate,
    updateCandidate,
    createApplication,
    createNote,
    moveApplication,
    rejectApplication,
    hireApplication,
  ],
  // Two methods, one wire format. Both mint a Harvest v3 bearer token; they
  // differ only in what they present to get one, and one of them has a stated
  // end-of-life.
  auth: [oauthClientCredentials, apiKey],
  healthChecks: [service, api, quota, silo],
} satisfies AppDefinition;
