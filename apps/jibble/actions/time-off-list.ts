import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/** `GET /v1/TimeOffOverview` — time-off requests (pending, approved, rejected, cancelled). */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const timeOffList: ActionDefinition<Input> = {
  key: "time-off-list",
  type: "search",
  resource: "time-off",
  title: "List Time Off Requests",
  description: "List time-off requests across the organization.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Time off requests" },
    { key: "count", type: "number", label: "Total matching requests (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(TIME_TRACKING_HOST, "/v1/TimeOffOverview", {
      filter: input.filter,
      select: input.select,
      expand: input.expand,
      orderBy: input.orderBy,
      top: input.top,
      skip: input.skip,
      count: input.count,
    });
  },
};

export default timeOffList;
