import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/tasks/{id}` — delete a task, including all its data.
 *
 * Tasks are deleted automatically 24 hours after they end. `idempotent: true`: the end
 * state (task gone) is the same no matter how many times this is called.
 */
interface Input {
  taskId: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task, including all its data.",
  idempotent: true,
  params: [taskIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting CloudConvert task", { taskId: input.taskId });
    const status = await new CloudConvertClient(ctx).status(
      `/tasks/${encodeURIComponent(input.taskId)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 204 };
  },
};

export default taskDelete;
