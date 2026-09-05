/**
 * Recruitee — an applicant tracking system (ATS): job offers, the candidates
 * applying to them, and the pipeline that moves a candidate from applied to
 * hired, over Recruitee's REST API (`api.recruitee.com`).
 *
 * Recruitee's parent company rebranded to **Tellent** in 2024, but as of
 * 2026-09-05 the product itself, its API host and its published API
 * reference are still Recruitee-branded — see README.md for exactly what was
 * checked before keeping this name, and `health/service.ts` for how the
 * (now Tellent-owned, multi-product) status page is filtered back down to
 * only the components this app depends on.
 *
 * Every endpoint here was verified two ways, not one: against
 * `apidocs.recruitee.com`'s own recorded request/response examples, AND live
 * against `api.recruitee.com` with a syntactically-plausible bad bearer
 * token. That second check matters because the published reference is an
 * auto-generated dump of Recruitee's ENTIRE web application (951 documented
 * actions across 247 resource groups — including admin, billing, GDPR and
 * referral-portal surfaces that need a signed-in browser session, not a
 * personal API token) with nothing in the document itself distinguishing
 * those from the resources a token can actually reach. See `lib/client.ts`
 * for the full account of what that document is and is not.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import candidateList from "./actions/candidate-list.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import candidateDelete from "./actions/candidate-delete.ts";

import offerList from "./actions/offer-list.ts";
import offerGet from "./actions/offer-get.ts";
import offerCreate from "./actions/offer-create.ts";

import departmentList from "./actions/department-list.ts";

import candidateNoteCreate from "./actions/candidate-note-create.ts";
import candidateNoteList from "./actions/candidate-note-list.ts";

import taskCreate from "./actions/task-create.ts";
import taskList from "./actions/task-list.ts";

import candidateTagCreate from "./actions/candidate-tag-create.ts";
import tagList from "./actions/tag-list.ts";

import placementList from "./actions/placement-list.ts";
import placementChangeStage from "./actions/placement-change-stage.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Candidates
    candidateList,
    candidateGet,
    candidateCreate,
    candidateUpdate,
    candidateDelete,
    // Offers (job postings)
    offerList,
    offerGet,
    offerCreate,
    // Departments
    departmentList,
    // Notes
    candidateNoteCreate,
    candidateNoteList,
    // Tasks
    taskCreate,
    taskList,
    // Tags
    candidateTagCreate,
    tagList,
    // Pipeline placements
    placementList,
    placementChangeStage,
  ],
  // A personal API token is the only mechanism a third-party integration can
  // use — Recruitee publishes no OAuth surface for one, and the un-scoped
  // `GET /admin` endpoint's own doc text names HTTP Basic with an account
  // email + password as a separate, legacy mechanism this app does not use.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
