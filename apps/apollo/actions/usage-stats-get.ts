import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `POST /usage_stats/api_usage_stats` — this team's current per-minute/hour/day usage
 * and limit for EVERY endpoint route, keyed by a stringified `["path", "action"]` pair
 * (e.g. `["api/v1/contacts", "search"]`). Useful when `health/request-rate.ts` (scoped to
 * one endpoint) isn't the endpoint a workflow actually cares about.
 */
const usageStatsGet: ActionDefinition<Record<string, never>> = {
  key: "usage-stats-get",
  type: "read",
  resource: "usage",
  title: "Get API Usage Stats",
  description: "Read this team's per-minute/hour/day usage and limits for every API route.",
  params: [],
  output: [{ key: "usage_stats", type: "object", label: 'Keyed by ["path", "action"]' }],

  async execute(_input, ctx) {
    const usage_stats = await new ApolloClient(ctx).post("/usage_stats/api_usage_stats");
    return { usage_stats };
  },
};

export default usageStatsGet;
