import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { timeClockIdParam } from "../lib/params.ts";

/**
 * `POST /time-clock/v1/time-clocks/{timeClockId}/time-activities` — bulk
 * back-fill shifts and/or manual breaks for one or more users.
 *
 * The request body is a genuinely nested structure — an array of
 * `{userId, shifts?: [...], manualbreaks?: [...]}` records, up to 100 users
 * per call, each with up to 50 shifts and 50 manual breaks of their own — so
 * this action passes it through as JSON rather than flattening it into a
 * single-record form the way the rest of this app's create/update actions
 * do. See Connecteam's own `UserTimeActivitiesCreateRequest` /
 * `TimeActivityShiftCreateRequest` / `TimeActivityManualBreakCreateRequest`
 * schemas for the exact per-item shape.
 *
 * Not idempotent: each call creates new time-activity records; there is no
 * documented idempotency key or natural dedupe.
 */
interface Input {
  timeClockId: number;
  timeActivities: unknown;
  isSplitShiftOnManualBreak?: boolean;
}

const timeActivityCreate: ActionDefinition<Input> = {
  key: "time-activity-create",
  type: "perform",
  resource: "time-activity",
  title: "Create Time Activities",
  description: "Back-fill shifts and/or manual breaks for one or more users on a time clock.",
  idempotent: false,
  params: [
    timeClockIdParam,
    {
      key: "timeActivities",
      label: "Time activities",
      type: "json",
      required: true,
      hint: 'Array of {"userId", "shifts"?: [...], "manualbreaks"?: [...]}. ' +
        "Each shift/break needs a start (and usually end) timestamp+timezone. " +
        "See Connecteam's API reference for the exact per-item fields.",
    },
    {
      key: "isSplitShiftOnManualBreak",
      label: "Split shift on manual break",
      type: "boolean",
      hint: "When on, creating a manual break splits any overlapping completed shift around it, " +
        "matching dashboard behavior. Off (default) leaves existing shifts unchanged.",
    },
  ],
  output: [
    { key: "timeActivitiesByUsers", type: "array", label: "Created time activities, by user" },
  ],

  execute(input, ctx) {
    const timeActivities = typeof input.timeActivities === "string"
      ? JSON.parse(input.timeActivities)
      : input.timeActivities;
    if (!Array.isArray(timeActivities) || timeActivities.length === 0) {
      throw new Error("Time activities must be a non-empty array");
    }
    return new ConnecteamClient(ctx).data(
      `/time-clock/v1/time-clocks/${input.timeClockId}/time-activities`,
      {
        method: "POST",
        body: {
          timeActivities,
          isSplitShiftOnManualBreak: input.isSplitShiftOnManualBreak ?? false,
        },
      },
    );
  },
};

export default timeActivityCreate;
