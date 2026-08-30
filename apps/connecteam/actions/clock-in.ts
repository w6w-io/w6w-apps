import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient } from "../lib/client.ts";
import { jobIdParam, timeClockIdParam } from "../lib/params.ts";

/**
 * `POST /time-clock/v1/time-clocks/{timeClockId}/clock-in` — clock a user in.
 *
 * `timestamp` is for replaying a punch that already happened (a physical
 * clock device flushing a queue after coming back online) — it must be no
 * more than 12 hours in the past and never in the future. Omit it to record
 * "now".
 *
 * Not idempotent: each call clocks in a new shift; calling it twice for the
 * same user creates two open shifts rather than being a no-op.
 */
interface Input {
  timeClockId: number;
  userId: number;
  jobId?: string;
  timezone?: string;
  schedulerShiftId?: string;
  timestamp?: number;
}

const clockIn: ActionDefinition<Input> = {
  key: "clock-in",
  type: "perform",
  resource: "time-clock",
  title: "Clock In",
  description: "Clock a user in to a time clock.",
  idempotent: false,
  params: [
    timeClockIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "Must already be assigned to this time clock.",
    },
    jobIdParam,
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Tz name (e.g. America/New_York). Defaults to the time clock's own setting.",
    },
    {
      key: "schedulerShiftId",
      label: "Scheduled shift ID",
      type: "string",
      hint: "The scheduled shift this clock-in fulfills, if any.",
    },
    {
      key: "timestamp",
      label: "Clock-in time (Unix seconds)",
      type: "number",
      hint: "Use only to record a punch that already happened. Max 12 hours in the past, never " +
        "in the future. Omit to use the current time.",
    },
  ],
  output: [
    { key: "shift", type: "object", label: "The created (open) shift" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/time-clock/v1/time-clocks/${input.timeClockId}/clock-in`,
      {
        method: "POST",
        body: compact({
          userId: input.userId,
          jobId: input.jobId,
          timezone: input.timezone,
          schedulerShiftId: input.schedulerShiftId,
          timestamp: input.timestamp,
        }),
      },
    );
  },
};

export default clockIn;
