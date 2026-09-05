import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `GET /tasks/:task_id/task_labels` — the join rows attaching labels to a
 * task.
 *
 * This is deliberately the join-record endpoint rather than
 * `GET /tasks/:task_id/labels` (which returns the labels themselves): the
 * join row's own `id` is what `task-label-remove` needs to detach a label,
 * and the label rows it references already come back from `label-list`.
 */
interface Input {
  taskId: number;
}

const taskLabelList: ActionDefinition<Input, unknown[]> = {
  key: "task-label-list",
  type: "search",
  resource: "task-label",
  title: "List Task Labels",
  description: "List the labels attached to a task, as the join records — each carries the " +
    "task-label ID that task-label-remove needs.",
  params: [{ key: "taskId", label: "Task ID", type: "number", required: true }],
  output: [{ key: "", type: "array", label: "Task labels" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/tasks/${input.taskId}/task_labels`);
  },
};

export default taskLabelList;
