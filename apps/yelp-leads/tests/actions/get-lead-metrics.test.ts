import { assertEquals } from "@std/assert";
import getLeadMetrics from "../../actions/get-lead-metrics.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-lead-metrics: reads cost_per_lead for a lead", async () => {
  const body = { metrics: { cost_per_lead: { value: 0, currency_code: "USD" } } };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await getLeadMetrics.execute({ leadId: "abc" }, ctx);

  assertEquals(result, body);
  assertEquals(pathOf(calls[0].url), "/v3/leads/abc/metrics");
  assertEquals(calls[0].method, "GET");
});
