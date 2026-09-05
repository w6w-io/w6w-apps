import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient, toNumberList } from "../lib/client.ts";
import {
  pageParams,
  sortOrderOptions,
  taskScopeOptions,
  taskSortByOptions,
  taskStatusOptions,
} from "../lib/params.ts";

/** `GET /c/{company_id}/tasks` — "List tasks for company". */
interface Input {
  scope?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  adminIds?: number[] | string;
  page?: number;
  limit?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List the company's tasks, optionally filtered by scope, status or assignee.",
  params: [
    { key: "scope", label: "Scope", type: "select", options: taskScopeOptions },
    { key: "status", label: "Status", type: "select", options: taskStatusOptions },
    { key: "sortBy", label: "Sort by", type: "select", options: taskSortByOptions },
    { key: "sortOrder", label: "Sort order", type: "select", options: sortOrderOptions },
    { key: "adminIds", label: "Assigned to admin IDs", type: "array", item: { type: "number" } },
    ...pageParams(),
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "meta", type: "object", label: "Completed/uncompleted counters" },
    { key: "references", type: "array", label: "Related admins the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/tasks", {
      query: {
        scope: input.scope,
        status: input.status,
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
        admin_ids: toNumberList(input.adminIds)?.join(","),
        page: input.page,
        limit: input.limit,
      },
    });
  },
};

export default taskList;
