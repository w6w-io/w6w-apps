import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `DELETE /tasks/:id` — delete a task.
 *
 * Onfleet only allows this for tasks still in the `unassigned` state.
 * **Active or completed tasks cannot be deleted** — Onfleet rejects the
 * request rather than force-completing or cancelling it. Force-completing an
 * active task is `task-complete`; there is no cancel endpoint.
 */
const action: ActionDefinition = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete task",
  description: "Delete an unassigned task. Active or completed tasks cannot be deleted.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Whether the task was deleted" }],

  async execute(input, ctx) {
    const { taskId } = input as { taskId: string };
    if (!taskId) throw new Error("`taskId` is required");
    await new OnfleetClient(ctx).request(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
    ctx.log("info", "deleted an Onfleet task", { taskId });
    return { deleted: true };
  },
};

export default action;
