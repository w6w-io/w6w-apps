/**
 * Process Street — checklist/workflow automation, over the Process Street Public API v1.1
 * (`public-api.process.st/api/v1.1`).
 *
 * Deliberately out of scope: Pages/Page Revisions (a separate content-document surface), Workflow
 * blueprint editing (creating/publishing revisions, tasks, widgets, logic rules — this app only
 * reads blueprints and runs them), Data Sets, Comments, Attachments, Approvals, Webhooks,
 * Scheduled Workflows, and the `/work/*` "my work" surface. See README for detail.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import workflowList from "./actions/workflow-list.ts";
import workflowGet from "./actions/workflow-get.ts";

import workflowRunCreate from "./actions/workflow-run-create.ts";
import workflowRunList from "./actions/workflow-run-list.ts";
import workflowRunSearch from "./actions/workflow-run-search.ts";
import workflowRunGet from "./actions/workflow-run-get.ts";
import workflowRunDelete from "./actions/workflow-run-delete.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskComplete from "./actions/task-complete.ts";
import taskUncomplete from "./actions/task-uncomplete.ts";
import taskListByAssignee from "./actions/task-list-by-assignee.ts";

import formFieldList from "./actions/form-field-list.ts";
import formFieldSet from "./actions/form-field-set.ts";

import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // workflow (blueprint, read-only)
    workflowList,
    workflowGet,
    // workflow run (checklist instance)
    workflowRunCreate,
    workflowRunList,
    workflowRunSearch,
    workflowRunGet,
    workflowRunDelete,
    // task
    taskList,
    taskGet,
    taskComplete,
    taskUncomplete,
    taskListByAssignee,
    // form field
    formFieldList,
    formFieldSet,
    // user
    userList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
