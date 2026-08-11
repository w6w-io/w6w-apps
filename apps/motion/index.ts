/**
 * Motion — the AI calendar and task manager (`usemotion.com`): create and query
 * tasks, projects, recurring tasks, comments and custom fields, and read the
 * workspaces, users, statuses and schedules everything else is addressed by,
 * over the Motion API at `api.usemotion.com`.
 *
 * Every path, verb, query parameter, body field and enum in this app was read
 * off Motion's own reference at `docs.usemotion.com/api-reference/…` on
 * 2026-08-11 and then confirmed against the live API on the same day. Nothing
 * came from a third-party integration directory. Motion publishes no OpenAPI
 * document, so the surface here is the 27 reference pages, one action each.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The docs host answers 200 for everything** (`lib/client.ts`).
 *     `docs.usemotion.com` returns a byte-identical 46,637-byte shell with HTTP
 *     200 for `/sitemap.xml`, `/llms.txt`, `/openapi.json` and every other
 *     unknown path. A reference page is identified by size and content, never by
 *     status code — which is how a first pass at this vendor concluded it was
 *     undocumented.
 *  2. **`Content-Type` is validated before routing and before auth**
 *     (`lib/client.ts`). A `POST`/`PATCH` without `content-type:
 *     application/json` gets `400 {"message":"Invalid Headers",…}` — even on a
 *     path that does not exist and with no credential attached, so the same
 *     error stands in for three unrelated problems.
 *  3. **One 401 body for four different credential faults** (`auth/api-key.ts`).
 *     Missing key, empty key, wrong key and wrong header name all return the
 *     same 43 bytes with the same `etag`. The `test` hook says what it could be
 *     rather than asserting a cause it cannot know.
 *  4. **The status page does not cover the API** (`health/service.ts`).
 *     `status.usemotion.com` is a real Better Stack page with exactly one
 *     component, `Webapp`, reporting `not_monitored` — and nothing for
 *     `api.usemotion.com`. That check is therefore `informational` and
 *     `health/api.ts` probes the API directly.
 *  5. **Two version prefixes on one host** (`lib/client.ts`). Custom fields live
 *     under `/beta`; everything else under `/v1`. There is no alias — the wrong
 *     prefix is a router 404.
 *
 * Two smaller ones worth knowing before writing a workflow: `PATCH /v1/tasks/{id}`
 * documents the **full create body** with `name` and `workspaceId` required, so
 * an update restates a task rather than patching a field
 * (`actions/task-update.ts`); and a recurring task's `priority` and
 * `deadlineType` accept **narrower** value sets than a one-off task's
 * (`lib/params.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskMove from "./actions/task-move.ts";
import taskDelete from "./actions/task-delete.ts";
import taskUnassign from "./actions/task-unassign.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";

import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";

import recurringTaskList from "./actions/recurring-task-list.ts";
import recurringTaskCreate from "./actions/recurring-task-create.ts";
import recurringTaskDelete from "./actions/recurring-task-delete.ts";

import workspaceList from "./actions/workspace-list.ts";
import userList from "./actions/user-list.ts";
import userGetMe from "./actions/user-get-me.ts";
import statusList from "./actions/status-list.ts";
import scheduleList from "./actions/schedule-list.ts";

import customFieldList from "./actions/custom-field-list.ts";
import customFieldCreate from "./actions/custom-field-create.ts";
import customFieldDelete from "./actions/custom-field-delete.ts";
import customFieldValueSetTask from "./actions/custom-field-value-set-task.ts";
import customFieldValueSetProject from "./actions/custom-field-value-set-project.ts";
import customFieldValueDeleteTask from "./actions/custom-field-value-delete-task.ts";
import customFieldValueDeleteProject from "./actions/custom-field-value-delete-project.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskMove,
    taskDelete,
    taskUnassign,
    // Projects
    projectList,
    projectGet,
    projectCreate,
    // Comments
    commentList,
    commentCreate,
    // Recurring tasks
    recurringTaskList,
    recurringTaskCreate,
    recurringTaskDelete,
    // Directory: the ids and names everything above is addressed by
    workspaceList,
    userList,
    userGetMe,
    statusList,
    scheduleList,
    // Custom fields (/beta)
    customFieldList,
    customFieldCreate,
    customFieldDelete,
    customFieldValueSetTask,
    customFieldValueSetProject,
    customFieldValueDeleteTask,
    customFieldValueDeleteProject,
  ],
  // API key only. Motion's reference documents exactly one authentication
  // mechanism on all 27 endpoint pages — the `X-API-Key` header. There is no
  // OAuth surface for third-party apps and no scoped-key concept.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
