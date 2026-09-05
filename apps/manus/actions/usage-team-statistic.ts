import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  type DailyStatistic,
  ManusClient,
  type UsageTeamStatisticResponse,
} from "../lib/client.ts";

interface Input {
  startDate?: number;
  endDate?: number;
}

/**
 * `GET /v2/usage.teamStatistic` — daily credit consumption totals for the
 * team over a date range. Meaningful for a team account; a personal account
 * has no team-wide total to report here (use `usage-list` instead).
 */
const usageTeamStatistic: ActionDefinition<Input, DailyStatistic[]> = {
  key: "usage-team-statistic",
  type: "read",
  resource: "usage",
  title: "Get Team Usage Statistic",
  description: "Get the team's daily credit consumption over a date range.",
  params: [
    {
      key: "startDate",
      label: "Start date",
      type: "number",
      hint: "Unix seconds. Omit for no lower bound.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "number",
      hint: "Unix seconds. Omit for no upper bound.",
    },
  ],
  output: [{ key: "", type: "array", label: "Daily statistics, ascending by date" }],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<UsageTeamStatisticResponse>(
      "/v2/usage.teamStatistic",
      { query: compact({ start_date: input.startDate, end_date: input.endDate }) },
    );
    return res.data;
  },
};

export default usageTeamStatistic;
