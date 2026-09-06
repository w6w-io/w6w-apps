import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/** `GET /v1/LeaveBalances` — accrued/taken/remaining leave per person and policy. */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const leaveBalanceList: ActionDefinition<Input> = {
  key: "leave-balance-list",
  type: "search",
  resource: "time-off",
  title: "List Leave Balances",
  description: "List leave balances (entitled, taken, remaining) per person and policy.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Leave balances" },
    { key: "count", type: "number", label: "Total matching balances (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(TIME_TRACKING_HOST, "/v1/LeaveBalances", {
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

export default leaveBalanceList;
