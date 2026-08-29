import { assertEquals } from "@std/assert";
import creditUsageStatsGet from "../../actions/credit-usage-stats-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credit-usage-stats-get: POSTs to /usage_stats/credit_usage_stats and returns both fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        credit_usage_stats: { lead_credit: { limit: 10000, consumed: 2500, left_over: 7500 } },
        current_credit_cycle: { start_date: "2026-08-01", end_date: "2026-08-31" },
      },
    },
  ]);
  const out = await creditUsageStatsGet.execute({}, ctx) as {
    credit_usage_stats: Record<string, unknown>;
    current_credit_cycle: { end_date: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/usage_stats/credit_usage_stats");
  assertEquals(out.credit_usage_stats.lead_credit, {
    limit: 10000,
    consumed: 2500,
    left_over: 7500,
  });
  assertEquals(out.current_credit_cycle.end_date, "2026-08-31");
});
