import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/tasks/{id}/cancel` — cancel a task in status `waiting` or `processing`.
 *
 * `idempotent: false`: CloudConvert documents cancellation as valid only for those two
 * statuses and does not say what a repeat call against an already-cancelled or
 * already-terminal task does, so this app does not assume it is a safe no-op the way
 * Apify's documented "an already-finished run does nothing" lets `run-abort` claim
 * `idempotent: true`.
 */
interface Input {
  taskId: string;
}

const taskCancel: ActionDefinition<Input> = {
  key: "task-cancel",
  type: "perform",
  resource: "task",
  title: "Cancel Task",
  description: "Cancel a task that is in status waiting or processing.",
  idempotent: false,
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    ctx.log("info", "cancelling CloudConvert task", { taskId: input.taskId });
    return new CloudConvertClient(ctx).data(
      `/tasks/${encodeURIComponent(input.taskId)}/cancel`,
      { method: "POST" },
    );
  },
};

export default taskCancel;
