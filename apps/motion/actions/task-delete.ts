import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, V1 } from "../lib/client.ts";

/**
 * `DELETE /v1/tasks/{id}` — delete a task.
 *
 * ## The reference types this id as an integer, and it is not one
 *
 * "Delete task" documents its path parameter as `id: integer`, while "Get
 * task", "Update task", "Move task" and "Unassign task" all document the same
 * parameter as `id: string`, and every task id this API returns is an opaque
 * string. The `integer` is a documentation slip; the value is passed through as
 * the string it is. Coercing it to a number — the reading the reference invites
 * — would fail on every real id.
 *
 * The reference documents no response body for this endpoint, so the status is
 * what is returned.
 *
 * Idempotent in the sense the runtime cares about: after one call and after five
 * the task is gone. A repeat call on an already-deleted id surfaces as an error
 * rather than being swallowed, because a 404 here usually means the id was
 * wrong rather than that the work was already done.
 */
interface Input {
  id: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task by id.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tasks result. Motion's delete reference types this as an " +
        "integer, which is a slip — task ids are opaque strings everywhere else in the API.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Motion task", { id: input.id });
    const status = await new MotionClient(ctx).status(`${V1}/tasks/${encodeId(input.id)}`, {
      method: "DELETE",
    });
    return { id: input.id, status };
  },
};

export default taskDelete;
