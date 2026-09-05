import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /tasks/:task_id/comments` — the comments on a task. */
interface Input {
  taskId: number;
  items?: number;
  page?: number;
  sort?: string;
}

const commentList: ActionDefinition<Input, unknown[]> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a task.",
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/tasks/${input.taskId}/comments`, {
      query: { items: input.items, page: input.page, sort: input.sort },
    });
  },
};

export default commentList;
