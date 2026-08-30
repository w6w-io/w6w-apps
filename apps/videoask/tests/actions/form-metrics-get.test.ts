import { assertEquals } from "@std/assert";
import formMetricsGet from "../../actions/form-metrics-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-metrics-get: defaults interval to weekly when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { interval: "weekly", totals: {}, data: [] } }]);
  await formMetricsGet.execute({ formId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/f1/metrics");
  assertEquals(queryOf(calls[0].url).interval, "weekly");
});

Deno.test("form-metrics-get: since/until pass through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formMetricsGet.execute(
    { formId: "f1", interval: "weekly", since: "2020-06-01", until: "2020-08-31" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    interval: "weekly",
    since: "2020-06-01",
    until: "2020-08-31",
  });
});
