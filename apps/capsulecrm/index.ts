/**
 * Capsule CRM — parties (people/organisations), opportunities (the sales
 * pipeline), tasks, and account metadata (users, pipelines, milestones),
 * over the Capsule REST API v2 (`developer.capsulecrm.com/v2`).
 *
 * Deliberately out of scope: Projects (Cases), Tags, Custom Field
 * definitions, file attachments, the `embed`-array collection-editing
 * semantics on Party/Opportunity (add/patch/delete-by-id), Tracks, and the
 * `/deleted` sync endpoints — all real v2 surfaces, left out to keep this
 * app to the objects a CRM workflow touches most. See README for detail.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";

import partyList from "./actions/party-list.ts";
import partyGet from "./actions/party-get.ts";
import partySearch from "./actions/party-search.ts";
import partyCreate from "./actions/party-create.ts";
import partyUpdate from "./actions/party-update.ts";
import partyDelete from "./actions/party-delete.ts";

import pipelineList from "./actions/pipeline-list.ts";
import milestoneList from "./actions/milestone-list.ts";

import opportunityList from "./actions/opportunity-list.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";
import opportunityDelete from "./actions/opportunity-delete.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import userList from "./actions/user-list.ts";
import userGetCurrent from "./actions/user-get-current.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // party
    partyList,
    partyGet,
    partySearch,
    partyCreate,
    partyUpdate,
    partyDelete,
    // pipeline / milestone (lookups for opportunity-create)
    pipelineList,
    milestoneList,
    // opportunity
    opportunityList,
    opportunityGet,
    opportunityCreate,
    opportunityUpdate,
    opportunityDelete,
    // task
    taskList,
    taskCreate,
    taskUpdate,
    taskDelete,
    // user
    userList,
    userGetCurrent,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
