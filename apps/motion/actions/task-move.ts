import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, omitUndefined, V1 } from "../lib/client.ts";
import { assigneeIdParam, taskIdParam, workspaceIdParam } from "../lib/params.ts";

/**
 * `PATCH /v1/tasks/{id}/move` — move a task to a different workspace.
 *
 * A dedicated endpoint rather than a field on the update call, which is worth
 * knowing because the update body *also* carries a required `workspaceId`:
 * that one restates where the task already lives, this one relocates it. Using
 * the wrong call is how a "move" silently becomes a no-op.
 *
 * `assigneeId` is accepted in the same request because an assignee is scoped to
 * a workspace — the person the task was assigned to may not be a member of the
 * destination.
 *
 * Idempotent: moving a task to a workspace it is already in leaves it there.
 */
interface Input {
  id: string;
  workspaceId: string;
  assigneeId?: string;
}

const taskMove: ActionDefinition<Input> = {
  key: "task-move",
  type: "perform",
  resource: "task",
  title: "Move Task",
  description: "Move a task to a different workspace, optionally reassigning it at the same time.",
  idempotent: true,
  params: [
    taskIdParam,
    workspaceIdParam(true, "The DESTINATION workspace. From the `id` of a List Workspaces result."),
    {
      ...assigneeIdParam,
      hint: "Optional. The current assignee may not be a member of the destination workspace, " +
        "which is why this endpoint accepts a new one.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "workspace.id", type: "string", label: "Workspace the task now belongs to" },
    { key: "assignees", type: "array", label: "Assignees" },
  ],

  execute(input, ctx) {
    ctx.log("info", "moving Motion task", { id: input.id, workspaceId: input.workspaceId });
    return new MotionClient(ctx).json(`${V1}/tasks/${encodeId(input.id)}/move`, {
      method: "PATCH",
      body: omitUndefined({
        workspaceId: input.workspaceId,
        assigneeId: input.assigneeId,
      }),
    });
  },
};

export default taskMove;
