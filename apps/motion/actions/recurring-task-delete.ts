import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, V1 } from "../lib/client.ts";

/**
 * `DELETE /v1/recurring-tasks/{id}` — delete a recurring-task definition.
 *
 * As with `DELETE /v1/tasks/{id}`, the reference types this path parameter as
 * `integer` while every id the API returns is an opaque string; it is passed
 * through unchanged. The reference documents no response body, so the status is
 * what is returned.
 *
 * There is no update endpoint for a recurring task — Motion publishes only
 * list, create and delete — so changing a frequency means deleting and
 * recreating.
 *
 * Idempotent: after one call and after five the definition is gone.
 */
interface Input {
  id: string;
}

const recurringTaskDelete: ActionDefinition<Input> = {
  key: "recurring-task-delete",
  type: "perform",
  resource: "recurring-task",
  title: "Delete Recurring Task",
  description:
    "Delete a recurring-task definition. Motion publishes no update endpoint for one, so " +
    "changing a frequency means delete and recreate.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Recurring task ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Recurring Tasks result. Motion's reference types this as an " +
        "integer, which is a slip — the ids it returns are opaque strings.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Recurring task deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Motion recurring task", { id: input.id });
    const status = await new MotionClient(ctx).status(
      `${V1}/recurring-tasks/${encodeId(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, status };
  },
};

export default recurringTaskDelete;
