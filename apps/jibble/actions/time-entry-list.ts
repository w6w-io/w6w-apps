import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/**
 * `GET /v1/TimeEntries` — the raw clock in/out events (not a computed timesheet). Each entry
 * is one edge (`type: "In"` or `"Out"`), not a duration — pair consecutive entries per person
 * to get a shift's length, or use `timesheet-list` for a pre-computed daily total instead.
 */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const timeEntryList: ActionDefinition<Input> = {
  key: "time-entry-list",
  type: "search",
  resource: "time-entry",
  title: "List Time Entries",
  description: "List raw clock in/out time entries.",
  params: odataListParams(50),
  output: [
    { key: "items", type: "array", label: "Time entries" },
    { key: "count", type: "number", label: "Total matching entries (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(TIME_TRACKING_HOST, "/v1/TimeEntries", {
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

export default timeEntryList;
