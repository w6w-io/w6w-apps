import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `POST /usage_stats/credit_usage_stats` — this team's credit balances for the current
 * billing cycle, across every credit type the plan meters. Also the source of the
 * `quota` health check — see `health/quota.ts` for why that endpoint was chosen.
 */
interface Output {
  credit_usage_stats: Record<string, { limit: number; consumed: number; left_over: number }>;
  current_credit_cycle: { start_date: string; end_date: string };
}

const creditUsageStatsGet: ActionDefinition<Record<string, never>> = {
  key: "credit-usage-stats-get",
  type: "read",
  resource: "usage",
  title: "Get Credit Usage Stats",
  description: "Read this team's credit balances for the current billing cycle.",
  params: [],
  output: [
    { key: "credit_usage_stats", type: "object", label: "Keyed by credit type" },
    { key: "current_credit_cycle", type: "object", label: "start_date, end_date" },
  ],

  async execute(_input, ctx) {
    return await new ApolloClient(ctx).post<Output>("/usage_stats/credit_usage_stats");
  },
};

export default creditUsageStatsGet;
