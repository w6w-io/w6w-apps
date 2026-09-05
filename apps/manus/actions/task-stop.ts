import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type TaskMutateResponse } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/task.stop` — stop a running task. Status becomes `stopped`; a
 * stopped task can still be resumed with `task-send-message`.
 *
 * `idempotent: true`: the end state after one call and after five is the
 * same task stopped. Returns no body beyond the envelope.
 */
interface Input {
  taskId: string;
}

const taskStop: ActionDefinition<Input, TaskMutateResponse> = {
  key: "task-stop",
  type: "perform",
  resource: "task",
  title: "Stop Task",
  description: "Stop a running task. Returns no body.",
  idempotent: true,
  params: [taskIdParam],
  output: [],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskMutateResponse>("/v2/task.stop", {
      method: "POST",
      body: { task_id: input.taskId },
    });
  },
};

export default taskStop;
