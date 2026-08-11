import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, V1 } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/tasks/{id}/assignee` — remove a task's assignee.
 *
 * A separate endpoint because there is no way to express "no assignee" through
 * the update call: `assigneeId` is a string, and omitting it means "leave it
 * alone" rather than "clear it". This is the only way to unassign.
 *
 * The reference documents no response body, so the status is what is returned.
 * Idempotent: unassigning an already-unassigned task leaves it unassigned.
 */
interface Input {
  id: string;
}

const taskUnassign: ActionDefinition<Input> = {
  key: "task-unassign",
  type: "perform",
  resource: "task",
  title: "Unassign Task",
  description:
    "Remove a task's assignee. The only way to clear an assignee — omitting assigneeId on an " +
    "update leaves the existing one in place.",
  idempotent: true,
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task unassigned" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "unassigning Motion task", { id: input.id });
    const status = await new MotionClient(ctx).status(
      `${V1}/tasks/${encodeId(input.id)}/assignee`,
      {
        method: "DELETE",
      },
    );
    return { id: input.id, status };
  },
};

export default taskUnassign;
