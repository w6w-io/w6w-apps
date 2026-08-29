import { assertEquals } from "@std/assert";
import usageStatsGet from "../../actions/usage-stats-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("usage-stats-get: POSTs to /usage_stats/api_usage_stats with no body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { '["api/v1/contacts", "search"]': { day: { limit: 6000 } } },
  }]);
  const out = await usageStatsGet.execute({}, ctx) as { usage_stats: Record<string, unknown> };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/usage_stats/api_usage_stats");
  assertEquals(calls[0].body, null);
  assertEquals(Object.keys(out.usage_stats).length, 1);
});
