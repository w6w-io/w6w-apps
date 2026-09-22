import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/tasks` — the organization's tasks
 * (to-dos).
 *
 * Returns `{"tasks": [{...Task}]}` plus the cursor envelope: `id`, `status`,
 * `project_id`, `project_type`, `summary`, `details`, `assignee_ids`,
 * `global_todo_id`, `pay_rate`, `bill_rate`, `completed_at`, `due_at`,
 * `created_at`, `updated_at`, `lock_version`, `integration_id`, `remote_id`,
 * `remote_alternate_id`, `metadata`.
 *
 * ## Two things that will trip a calling workflow up
 *
 * **`status` is an array with seven values, not three.** The document lists
 * `active`, `completed`, `deleted`, `archived`, `archived_native_active`,
 * `archived_native_completed`, `archived_native_deleted`, and the operation
 * description mentions only the first three. `deleted` is a status a task can
 * *be in*, not an exclusion — the list will happily return deleted tasks.
 *
 * **A `integration_id`/`remote_id` task is owned by the third party.** The
 * vendor's own note on `POST /v2/projects/{project_id}/tasks` is that a task
 * belonging to an integrated project must be created in that tool instead. The
 * fields to check are on the row this action returns.
 *
 * `include=users,projects` side-loads the assignees and the project.
 */
interface Input {
  organization_id: number;
  status?: string;
  user_ids?: string;
  project_ids?: string;
  only_global_todos?: boolean;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List an organization's tasks (GET /v2/organizations/{organization_id}/tasks).",
  params: [
    organizationIdParam,
    csvParam("status", "Statuses", "Filter tasks by status.", [
      "active",
      "completed",
      "deleted",
      "archived",
      "archived_native_active",
      "archived_native_completed",
      "archived_native_deleted",
    ]),
    csvParam("user_ids", "Assignee user IDs", "Tasks assigned to any of these users.", []),
    csvParam("project_ids", "Project IDs", "Tasks in any of these projects.", []),
    {
      key: "only_global_todos",
      label: "Only global to-dos",
      type: "boolean",
      hint: "Return only global to-dos.",
      advanced: true,
    },
    csvParam("include", "Include", "Related data to side-load.", ["users", "projects"]),
    ...paginationParams(),
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/tasks`, {
      query: {
        status: input.status,
        user_ids: input.user_ids,
        project_ids: input.project_ids,
        only_global_todos: input.only_global_todos,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
