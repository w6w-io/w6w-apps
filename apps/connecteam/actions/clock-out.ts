import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient } from "../lib/client.ts";
import { timeClockIdParam } from "../lib/params.ts";

/**
 * `POST /time-clock/v1/time-clocks/{timeClockId}/clock-out` — clock a user
 * out of their currently open shift.
 *
 * `timestamp`, like `clock-in`, must be no more than 12 hours in the past,
 * never in the future, and after the open shift's own clock-in time.
 *
 * Not idempotent: retrying after a successful clock-out fails (there is no
 * open shift left to close), so it must not be retried blindly.
 */
interface Input {
  timeClockId: number;
  userId: number;
  timezone?: string;
  timestamp?: number;
}

const clockOut: ActionDefinition<Input> = {
  key: "clock-out",
  type: "perform",
  resource: "time-clock",
  title: "Clock Out",
  description: "Clock a user out of their currently open shift.",
  idempotent: false,
  params: [
    timeClockIdParam,
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Tz name (e.g. America/New_York). Defaults to the time clock's own setting.",
    },
    {
      key: "timestamp",
      label: "Clock-out time (Unix seconds)",
      type: "number",
      hint: "Use only to record a punch that already happened. Max 12 hours in the past, never " +
        "in the future, and after the open shift's clock-in. Omit to use the current time.",
    },
  ],
  output: [
    { key: "shift", type: "object", label: "The closed shift" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/time-clock/v1/time-clocks/${input.timeClockId}/clock-out`,
      {
        method: "POST",
        body: compact({
          userId: input.userId,
          timezone: input.timezone,
          timestamp: input.timestamp,
        }),
      },
    );
  },
};

export default clockOut;
