/**
 * Streak — a CRM built inside Gmail: pipelines, boxes (deals/records), stages,
 * custom fields, contacts, organizations and tasks over the Streak API v1
 * (`api.streak.com/api/v1`).
 *
 * Every path, verb and field in this app was verified on 2026-08-25 against
 * Streak's own reference (`streak.readme.io`, a ReadMe.io site backed by a
 * real OpenAPI 3.1 document — extracted from the site's rendered pages,
 * `info.title` `streak-v1`) plus live probes against `api.streak.com` and
 * `status.streak.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **Three of the "create" endpoints take a form body, not JSON.**
 *     `PUT /pipelines`, `PUT /pipelines/{key}/stages` and
 *     `PUT /pipelines/{key}/fields` are `application/x-www-form-urlencoded`
 *     in the vendor's own spec, while every sibling POST "update" on the
 *     same resources — and every other create in this API — is JSON. See
 *     `lib/client.ts`.
 *  2. **List endpoints use four different envelopes.** A bare array
 *     (`pipeline-list`, `field-list`, `box-list`), an object keyed by id
 *     (`stage-list`), `{"results": [...]}` (`task-list`, `team-list`), and a
 *     further-nested `{"results": {"boxes": [...], ...}}` (`search`). See
 *     `lib/client.ts`.
 *  3. **Two different write shapes for "who's assigned," on two different
 *     endpoints.** `box-create`'s `assignedToSharingEntries` is a JSON
 *     ARRAY-OF-OBJECTS, itself encoded as a STRING inside the outer JSON
 *     body; `box-update`'s same-named field is a plain array of user keys,
 *     not stringified at all. See `actions/box-create.ts` and
 *     `actions/box-update.ts`.
 *  4. **`create-a-task`'s body requires a field named `key` that duplicates
 *     the path's `boxKey`**, and the RESPONSE's own `key` field means
 *     something else entirely (the new task's key). See
 *     `actions/task-create.ts`.
 *  5. **Two different 401 bodies for two different auth failures**, checked
 *     live: no credential at all answers `{"error": "Authentication
 *     required"}`; a wrong key answers `{"success": false, "error":
 *     "invalid api key"}`. See `auth/api-key.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGetCurrent from "./actions/user-get-current.ts";
import userGet from "./actions/user-get.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";

import pipelineList from "./actions/pipeline-list.ts";
import pipelineGet from "./actions/pipeline-get.ts";
import pipelineCreate from "./actions/pipeline-create.ts";
import pipelineUpdate from "./actions/pipeline-update.ts";
import pipelineDelete from "./actions/pipeline-delete.ts";

import stageList from "./actions/stage-list.ts";
import stageGet from "./actions/stage-get.ts";
import stageCreate from "./actions/stage-create.ts";
import stageUpdate from "./actions/stage-update.ts";
import stageDelete from "./actions/stage-delete.ts";

import fieldList from "./actions/field-list.ts";
import fieldGet from "./actions/field-get.ts";
import fieldCreate from "./actions/field-create.ts";
import fieldUpdate from "./actions/field-update.ts";
import fieldDelete from "./actions/field-delete.ts";

import boxList from "./actions/box-list.ts";
import boxGet from "./actions/box-get.ts";
import boxCreate from "./actions/box-create.ts";
import boxUpdate from "./actions/box-update.ts";
import boxDelete from "./actions/box-delete.ts";
import boxFieldValueGet from "./actions/box-field-value-get.ts";
import boxFieldValueUpdate from "./actions/box-field-value-update.ts";

import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import organizationGet from "./actions/organization-get.ts";
import organizationUpdate from "./actions/organization-update.ts";
import organizationDelete from "./actions/organization-delete.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import search from "./actions/search.ts";
import boxSearchByName from "./actions/box-search-by-name.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users & teams
    userGetCurrent,
    userGet,
    teamList,
    teamGet,
    // Pipelines
    pipelineList,
    pipelineGet,
    pipelineCreate,
    pipelineUpdate,
    pipelineDelete,
    // Stages
    stageList,
    stageGet,
    stageCreate,
    stageUpdate,
    stageDelete,
    // Pipeline fields
    fieldList,
    fieldGet,
    fieldCreate,
    fieldUpdate,
    fieldDelete,
    // Boxes (records)
    boxList,
    boxGet,
    boxCreate,
    boxUpdate,
    boxDelete,
    boxFieldValueGet,
    boxFieldValueUpdate,
    // Contacts
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // Organizations
    organizationGet,
    organizationUpdate,
    organizationDelete,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    // Search
    search,
    boxSearchByName,
  ],
  // API key only. Streak publishes no OAuth surface for third-party apps —
  // an HTTP Basic-auth key, minted from Gmail's Streak sidebar, is the whole
  // authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
