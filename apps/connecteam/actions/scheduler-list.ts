import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";

/** `GET /scheduler/v1/schedulers` — the account's schedules. No filters, no pagination. */
interface Output {
  schedulers: unknown[];
}

const schedulerList: ActionDefinition<Record<string, never>, Output> = {
  key: "scheduler-list",
  type: "read",
  resource: "scheduler",
  title: "List Schedules",
  description: "List the account's schedules.",
  params: [],
  output: [
    { key: "schedulers", type: "array", label: "Schedules" },
  ],

  execute(_input, ctx) {
    return new ConnecteamClient(ctx).data<Output>("/scheduler/v1/schedulers");
  },
};

export default schedulerList;
