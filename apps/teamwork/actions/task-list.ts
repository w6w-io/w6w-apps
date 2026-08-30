import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  projectIds?: string;
  tasklistIds?: string;
  status?: string;
  updatedAfter?: string;
  includeCompletedTasks?: boolean;
  page?: number;
  pageSize?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks across projects. Use the filters to narrow the set.",
  params: [
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "projectIds",
      label: "Project IDs",
      type: "string",
      row: "filter",
      hint: "Comma-separated.",
    },
    {
      key: "tasklistIds",
      label: "Task list IDs",
      type: "string",
      row: "filter",
      hint: "Comma-separated.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "upcoming", label: "Upcoming" },
        { value: "late", label: "Late" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "datetime",
      hint: "Only tasks updated on or after this time.",
    },
    { key: "includeCompletedTasks", label: "Include completed", type: "boolean" },
    ...pagination,
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects/api/v3/tasks.json", {
      query: {
        searchTerm: unset(input.searchTerm),
        projectIds: csvIds(input.projectIds),
        tasklistIds: csvIds(input.tasklistIds),
        status: input.status ? [input.status] : undefined,
        updatedAfter: unset(input.updatedAfter),
        includeCompletedTasks: input.includeCompletedTasks,
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default taskList;
