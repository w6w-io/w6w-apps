import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-aggregation.ts";

const pipeline = [
  { source: { events: null, timeSeries: { period: "dayRange", first: "now()", count: 1 } } },
  { identified: "visitorId" },
  { reduce: [{ totalEvents: { sum: "numEvents" } }] },
];

Deno.test("run-aggregation: posts the wrapped pipeline and returns results + startTime", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { startTime: 1690171200000, results: [{ count: 19 }] } },
  ]);
  const result = await action.execute!({
    name: "events by visitor",
    pipeline: JSON.stringify(pipeline),
  }, ctx) as { results: unknown[]; startTime: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/aggregation");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.request.name, "events by visitor");
  assertEquals(body.request.pipeline, pipeline);
  assertEquals(body.response.mimeType, "application/json");
  assertEquals(result.results, [{ count: 19 }]);
  assertEquals(result.startTime, 1690171200000);
});

Deno.test("run-aggregation: `pipeline` must be a non-empty array", async () => {
  await assertRejects(
    async () => await action.execute!({ pipeline: "[]" }, mockCtx([]).ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute!({ pipeline: '{"not":"array"}' }, mockCtx([]).ctx),
    Error,
    "non-empty",
  );
});

Deno.test("run-aggregation: an absent `name` is omitted rather than sent as undefined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  await action.execute!({ pipeline: JSON.stringify(pipeline) }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("name" in body.request, false);
});
