import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { timelogIdParam } from "../lib/params.ts";

/**
 * `DELETE /timelogs/{timelogId}` — delete a timelog record by ID.
 *
 * Marked idempotent: deleting an already-deleted timelog answers
 * `404 resource_not_found` rather than a second side effect.
 */
interface Input {
  timelogId: string;
}

const timelogDelete: ActionDefinition<Input> = {
  key: "timelog-delete",
  type: "perform",
  resource: "timelog",
  title: "Delete Timelog",
  description: "Delete a timelog record by ID.",
  idempotent: true,
  params: [timelogIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const status = await new WrikeClient(ctx, host).status(
      `/timelogs/${encodeURIComponent(input.timelogId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default timelogDelete;
