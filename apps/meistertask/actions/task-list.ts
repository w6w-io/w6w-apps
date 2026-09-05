import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /projects/:project_id/tasks` — every task in one project. */
interface Input {
  projectId: number;
  assignedToMe?: boolean;
  focusedByMe?: boolean;
  status?: string;
  items?: number;
  page?: number;
  sort?: string;
}

const taskList: ActionDefinition<Input, unknown[]> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks in Project",
  description: "List the tasks in a project.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "assignedToMe", label: "Assigned to me only", type: "boolean" },
    { key: "focusedByMe", label: "Focused by me only", type: "boolean" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "completed", label: "Completed" },
        { value: "completed_archived", label: "Completed & archived" },
        { value: "trashed", label: "Trashed" },
      ],
    },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/projects/${input.projectId}/tasks`, {
      query: {
        assigned_to_me: input.assignedToMe,
        focused_by_me: input.focusedByMe,
        status: input.status,
        items: input.items,
        page: input.page,
        sort: input.sort,
      },
    });
  },
};

export default taskList;
