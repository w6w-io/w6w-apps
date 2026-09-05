import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type TaskDeleteResponse } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/task.delete` — delete a task permanently. If it is still running,
 * use `task-stop` first. Agent-related (subtask) tasks cannot be deleted.
 *
 * `idempotent: true`: the end state after one call and after five is the same
 * task gone. A repeat call on an already-deleted id surfaces the vendor's own
 * not-found error rather than being swallowed.
 */
interface Input {
  taskId: string;
}

const taskDelete: ActionDefinition<Input, TaskDeleteResponse> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task. Stop it first if it is still running.",
  idempotent: true,
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted task ID" },
    { key: "deleted", type: "boolean", label: "Always true on success" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskDeleteResponse>("/v2/task.delete", {
      method: "POST",
      body: { task_id: input.taskId },
    });
  },
};

export default taskDelete;
