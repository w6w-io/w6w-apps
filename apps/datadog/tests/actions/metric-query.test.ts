import { assert, assertEquals } from "@std/assert";
import metricQuery from "../../actions/metric-query.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("metric-query: calls GET /api/v1/query with query, from and to", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "ok", res_type: "time_series", series: [{ metric: "system.cpu.user" }] },
  }]);
  const out = await metricQuery.execute(
    { query: "avg:system.cpu.user{*}", from: 1_700_000_000, to: 1_700_003_600 },
    ctx,
  ) as { status: string; series: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/query");
  assertEquals(queryOf(calls[0].url), {
    query: "avg:system.cpu.user{*}",
    from: "1700000000",
    to: "1700003600",
  });
  assertEquals(out.status, "ok");
  assertEquals(out.series.length, 1);
});

/**
 * Datadog answers 200 with `status: "error"` for a query that parses but cannot
 * be evaluated. Both fields are surfaced verbatim so a workflow can branch on
 * "the call worked and the query did not".
 */
Deno.test("metric-query: a 200 carrying an error is passed through, not flattened", async () => {
  const { ctx } = mockCtx([{
    body: { status: "error", error: "Invalid aggregation", series: [] },
  }]);
  const out = await metricQuery.execute({ query: "bad", from: 1, to: 2 }, ctx) as {
    status: string;
    error: string;
  };
  assertEquals(out.status, "error");
  assertEquals(out.error, "Invalid aggregation");
});

Deno.test("metric-query: an empty series is a valid answer, not a failure", async () => {
  const { ctx } = mockCtx([{ body: { status: "ok", series: [] } }]);
  const out = await metricQuery.execute({ query: "avg:nope{*}", from: 1, to: 2 }, ctx) as {
    series: unknown[];
  };
  assertEquals(out.series, []);
});

Deno.test("metric-query: the time hints say seconds, which is what v1 takes", () => {
  for (const key of ["from", "to"]) {
    const hint = metricQuery.params?.find((p) => p.key === key)?.hint ?? "";
    assert(hint.includes("seconds"), `${key}: ${hint}`);
  }
});
