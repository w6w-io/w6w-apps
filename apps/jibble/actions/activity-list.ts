import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/** `GET /v1/Activities` — the work categories time can be tracked against. */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description: "List the organization's activities (time-tracking categories).",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Activities" },
    { key: "count", type: "number", label: "Total matching activities (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/Activities", {
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

export default activityList;
