import { assertEquals } from "@std/assert";
import metricList from "../../actions/metric-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metric-list: calls GET /api/v1/metrics with from", async () => {
  const { ctx, calls } = mockCtx([{ body: { from: "1700000000", metrics: ["a", "b"] } }]);
  const out = await metricList.execute({ from: 1_700_000_000 }, ctx) as { metrics: string[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/metrics");
  assertEquals(queryOf(calls[0].url), { from: "1700000000" });
  assertEquals(out.metrics, ["a", "b"]);
});

Deno.test("metric-list: host and tag filters use Datadog's own parameter names", async () => {
  const { ctx, calls } = mockCtx([{ body: { metrics: [] } }]);
  await metricList.execute({ from: 1, host: "web-01", tagFilter: "env:prod" }, ctx);
  assertEquals(queryOf(calls[0].url), { from: "1", host: "web-01", tag_filter: "env:prod" });
});

/** Datadog echoes `from` as a string; the output field says so rather than lying. */
Deno.test("metric-list: from is declared a string on the output, matching the vendor", () => {
  const field = (metricList.output as Array<{ key: string; type: string }>)
    .find((f) => f.key === "from");
  assertEquals(field?.type, "string");
});
