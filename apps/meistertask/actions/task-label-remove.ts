import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `DELETE /task_labels/:id` — detach a label from a task.
 *
 * Takes the task-label join ID from `task-label-list` or `task-label-add`'s
 * output, not the label's own ID.
 */
interface Input {
  id: number;
}

const taskLabelRemove: ActionDefinition<Input, { deleted: boolean }> = {
  key: "task-label-remove",
  type: "perform",
  resource: "task-label",
  title: "Remove Label from Task",
  description: "Detach a label from a task, given the task-label join ID (from " +
    "task-label-list or task-label-add).",
  idempotent: true,
  params: [{ key: "id", label: "Task-Label ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new MeisterTaskClient(ctx).status(`/task_labels/${input.id}`, {
      method: "DELETE",
    });
    return { deleted: status === 204 };
  },
};

export default taskLabelRemove;
