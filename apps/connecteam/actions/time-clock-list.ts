import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";

/** `GET /time-clock/v1/time-clocks` — the account's time clocks. No filters, no pagination. */
interface Output {
  timeClocks: unknown[];
}

const timeClockList: ActionDefinition<Record<string, never>, Output> = {
  key: "time-clock-list",
  type: "read",
  resource: "time-clock",
  title: "List Time Clocks",
  description: "List the account's time clocks.",
  params: [],
  output: [
    { key: "timeClocks", type: "array", label: "Time clocks" },
  ],

  execute(_input, ctx) {
    return new ConnecteamClient(ctx).data<Output>("/time-clock/v1/time-clocks");
  },
};

export default timeClockList;
