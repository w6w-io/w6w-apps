import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `DELETE /tasks/{taskId}` — Wrike's own description for this endpoint is
 * just "Delete task by Id", but the API's own `TreeScope` enum documents a
 * dedicated `RbTask` ("Task is in Recycle Bin") value, so this is a move to
 * the Recycle Bin rather than a permanent purge — consistent with the
 * (differently-worded) Delete Folder endpoint.
 *
 * Marked idempotent: deleting an already-deleted (or already-purged) task
 * answers `404 resource_not_found` rather than causing a second side effect,
 * so a retry is safe.
 */
interface Input {
  taskId: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Move a task to the Recycle Bin.",
  idempotent: true,
  params: [taskIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const status = await new WrikeClient(ctx, host).status(
      `/tasks/${encodeURIComponent(input.taskId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default taskDelete;
