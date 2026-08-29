import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/tasks/{id}/retry` — create a new task, based on the payload of another task.
 *
 * `idempotent: false`: CloudConvert's own docs say the response is "the new task (with a
 * new task ID)" — every call creates a fresh task and, once it runs, spends conversion
 * credits again, exactly the reasoning `job-create` documents for its own non-idempotency.
 */
interface Input {
  taskId: string;
}

const taskRetry: ActionDefinition<Input> = {
  key: "task-retry",
  type: "perform",
  resource: "task",
  title: "Retry Task",
  description: "Create a new task based on the payload of another task.",
  idempotent: false,
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "New task ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    ctx.log("info", "retrying CloudConvert task", { taskId: input.taskId });
    return new CloudConvertClient(ctx).data(
      `/tasks/${encodeURIComponent(input.taskId)}/retry`,
      { method: "POST" },
    );
  },
};

export default taskRetry;
