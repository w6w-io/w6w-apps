import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/**
 * `GET /tasks/:task_id/checklists` — the checklists on a task.
 *
 * MeisterTask also lets a checklist live at the project level as a reusable
 * template (`GET /projects/:project_id/checklists`, `task_id: null`) — left
 * out here since the task-scoped case is what a workflow almost always
 * wants; the project-scoped list is a straightforward addition of the same
 * shape if needed.
 */
interface Input {
  taskId: number;
  items?: number;
  page?: number;
  sort?: string;
}

const checklistList: ActionDefinition<Input, unknown[]> = {
  key: "checklist-list",
  type: "search",
  resource: "checklist",
  title: "List Checklists",
  description: "List the checklists on a task.",
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Checklists" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/tasks/${input.taskId}/checklists`, {
      query: { items: input.items, page: input.page, sort: input.sort },
    });
  },
};

export default checklistList;
