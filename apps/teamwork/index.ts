/**
 * Teamwork — projects, tasks, task lists, milestones, time tracking and people.
 *
 * The thing that shapes this app is that **every account has its own host** —
 * `{yourSiteName}.teamwork.com`, confirmed against
 * apidocs.teamwork.com/guides/teamwork/authentication's own curl examples.
 * A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.teamwork.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the site name is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Two API generations are mixed deliberately, not by accident: reads, task
 * updates and time-tracking are the modern V3 endpoints
 * (`/projects/api/v3/...`), but project/task-list/milestone
 * create+update+delete only exist as the older V1 endpoints
 * (`/projects.json`, `/projects/{id}/tasklists.json`, ...) — confirmed
 * against the OpenAPI document apidocs.teamwork.com itself serves (its
 * "Download Swagger" link), whose `paths` carry no shared prefix. Each
 * action's own comment says which generation it targets.
 *
 * Deliberately absent: boards/columns/cards (a separate Kanban surface),
 * messages/notebooks (content objects, not project-management primitives),
 * workflows/stages, and file attachments — out of scope for the ~15-action
 * budget this pack targets. No webhook/trigger surface — that is a Trigger,
 * not an Action.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import tasklistList from "./actions/tasklist-list.ts";
import tasklistCreate from "./actions/tasklist-create.ts";

import milestoneList from "./actions/milestone-list.ts";
import milestoneCreate from "./actions/milestone-create.ts";

import timelogList from "./actions/timelog-list.ts";
import timelogCreate from "./actions/timelog-create.ts";

import personList from "./actions/person-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // project
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    // task
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    // tasklist
    tasklistList,
    tasklistCreate,
    // milestone
    milestoneList,
    milestoneCreate,
    // timelog
    timelogList,
    timelogCreate,
    // person
    personList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
