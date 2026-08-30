import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { timeClockIdParam } from "../lib/params.ts";

/**
 * `DELETE /time-clock/v1/time-clocks/{timeClockId}/time-activities/{timeActivityId}`
 * — delete one shift, manual break or time-off entry.
 *
 * Idempotent: a repeat call against an id that no longer exists reaches the
 * same end state a retry expects.
 */
interface Input {
  timeClockId: number;
  timeActivityId: string;
}

const timeActivityDelete: ActionDefinition<Input> = {
  key: "time-activity-delete",
  type: "perform",
  resource: "time-activity",
  title: "Delete Time Activity",
  description: "Delete one shift, manual break or time-off entry from a time clock.",
  idempotent: true,
  params: [
    timeClockIdParam,
    { key: "timeActivityId", label: "Time Activity ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new ConnecteamClient(ctx).status(
      `/time-clock/v1/time-clocks/${input.timeClockId}/time-activities/${input.timeActivityId}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default timeActivityDelete;
