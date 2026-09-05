/**
 * MeisterTask — the Kanban-style project and task manager from the Meister
 * suite (alongside MindMeister), over its REST API at
 * `https://www.meistertask.com/api`.
 *
 * Every path, verb, parameter and enum in this app was verified 2026-09-05
 * against the vendor's own OpenAPI 3.1 document — embedded
 * server-side-rendered in every `developers.meistertask.com/reference/*`
 * page (`document.api.schema` inside that page's `ssr-props` script; there
 * is no separately hosted `openapi.json`) — cross-checked against the
 * "Overview" prose page for each resource, plus live probes against
 * `www.meistertask.com` and `status.meistertask.com`. Nothing here came from
 * a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two error envelopes coexist, and only one is documented**
 *     (`lib/client.ts`). The reference page shows `{"errors": [...]}` for
 *     everything; a live `401` actually answers a singular
 *     `{"error": {...}}` instead — the same shape the spec's own Attachment
 *     examples use, which turns out to be the auth layer's shape generally,
 *     not an Attachment quirk.
 *  2. **One create endpoint is misfiled in the vendor's own spec**
 *     (`actions/checklist-item-create.ts`). Creating a checklist item is
 *     documented under the literal path string
 *     `/checklists/:checklist_id/checklist_items` with `task_id` as its only
 *     declared parameter — the vendor's own schema-upload log records this
 *     exact mismatch as a validation warning. This app calls the
 *     conventional `POST /checklists/{checklist_id}/checklist_items`
 *     instead, matching its `GET` sibling.
 *  3. **A checklist item's `status` enum is undocumented where you'd look
 *     for it** (`actions/checklist-item-create.ts`,
 *     `actions/checklist-item-update.ts`). The `PUT`/`POST` operation specs
 *     just say "The status of the checklist-item", `type: Number` — the
 *     actual values (`1` actionable, `5` completed) only appear in the
 *     separate Checklist-Item "Overview" page's model table.
 *
 * MeisterTask shares MindMeister's OAuth 2.0 and personal-access-token
 * backend (stated on the vendor's own authentication page) — see
 * `auth/oauth2.ts` and `auth/personal-access-token.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import projectList from "./actions/project-list.ts";
import projectCreate from "./actions/project-create.ts";
import projectGet from "./actions/project-get.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDuplicate from "./actions/project-duplicate.ts";
import projectMembersList from "./actions/project-members-list.ts";

import sectionList from "./actions/section-list.ts";
import sectionCreate from "./actions/section-create.ts";
import sectionGet from "./actions/section-get.ts";
import sectionUpdate from "./actions/section-update.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskUpdate from "./actions/task-update.ts";
import subtaskCreate from "./actions/subtask-create.ts";
import subtaskList from "./actions/subtask-list.ts";

import checklistList from "./actions/checklist-list.ts";
import checklistCreate from "./actions/checklist-create.ts";
import checklistUpdate from "./actions/checklist-update.ts";
import checklistDelete from "./actions/checklist-delete.ts";

import checklistItemList from "./actions/checklist-item-list.ts";
import checklistItemCreate from "./actions/checklist-item-create.ts";
import checklistItemUpdate from "./actions/checklist-item-update.ts";
import checklistItemDelete from "./actions/checklist-item-delete.ts";

import labelList from "./actions/label-list.ts";
import labelCreate from "./actions/label-create.ts";
import labelUpdate from "./actions/label-update.ts";
import labelDelete from "./actions/label-delete.ts";
import taskLabelList from "./actions/task-label-list.ts";
import taskLabelAdd from "./actions/task-label-add.ts";
import taskLabelRemove from "./actions/task-label-remove.ts";

import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import commentDelete from "./actions/comment-delete.ts";

import personList from "./actions/person-list.ts";
import personGet from "./actions/person-get.ts";
import personMe from "./actions/person-me.ts";
import projectPersonList from "./actions/project-person-list.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    // Projects
    projectList,
    projectCreate,
    projectGet,
    projectUpdate,
    projectDuplicate,
    projectMembersList,
    // Sections
    sectionList,
    sectionCreate,
    sectionGet,
    sectionUpdate,
    // Tasks
    taskList,
    taskCreate,
    taskGet,
    taskUpdate,
    subtaskCreate,
    subtaskList,
    // Checklists
    checklistList,
    checklistCreate,
    checklistUpdate,
    checklistDelete,
    // Checklist items
    checklistItemList,
    checklistItemCreate,
    checklistItemUpdate,
    checklistItemDelete,
    // Labels
    labelList,
    labelCreate,
    labelUpdate,
    labelDelete,
    taskLabelList,
    taskLabelAdd,
    taskLabelRemove,
    // Comments
    commentList,
    commentCreate,
    commentDelete,
    // Persons
    personList,
    personGet,
    personMe,
    projectPersonList,
  ],
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
