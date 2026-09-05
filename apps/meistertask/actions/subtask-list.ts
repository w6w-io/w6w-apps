import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /tasks/:task_id/subtasks` — the subtasks under a parent task. */
interface Input {
  taskId: number;
  items?: number;
  page?: number;
  sort?: string;
}

const subtaskList: ActionDefinition<Input, unknown[]> = {
  key: "subtask-list",
  type: "search",
  resource: "task",
  title: "List Subtasks",
  description: "List the subtasks under a parent task.",
  params: [
    { key: "taskId", label: "Parent Task ID", type: "number", required: true },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Subtasks" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/tasks/${input.taskId}/subtasks`, {
      query: { items: input.items, page: input.page, sort: input.sort },
    });
  },
};

export default subtaskList;
