import { assert, assertEquals, assertRejects } from "@std/assert";
import metricSubmit from "../../actions/metric-submit.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

interface Payload {
  series: Array<Record<string, unknown>>;
}

Deno.test("metric-submit: POSTs one series to /api/v2/series", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  const out = await metricSubmit.execute(
    { metric: "myapp.orders", points: [{ timestamp: 1_700_000_000, value: 3 }] },
    ctx,
  ) as { metric: string; pointCount: number; status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/series");
  const payload = bodyOf(calls[0]) as unknown as Payload;
  assertEquals(payload.series.length, 1);
  assertEquals(payload.series[0].metric, "myapp.orders");
  assertEquals(payload.series[0].points, [{ timestamp: 1_700_000_000, value: 3 }]);
  assertEquals(out, { metric: "myapp.orders", pointCount: 1, status: 202 });
});

/**
 * The trap this action exists to defuse: a bare number must be stamped in
 * POSIX **seconds**. A millisecond timestamp is accepted by Datadog with a 202
 * and then silently dropped, so the wrong unit here is invisible in production.
 */
Deno.test("metric-submit: a bare number is stamped in seconds, not milliseconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  const before = Math.floor(Date.now() / 1000);
  await metricSubmit.execute({ metric: "m", points: 42 }, ctx);
  const after = Math.floor(Date.now() / 1000);

  const point = (bodyOf(calls[0]) as unknown as Payload).series[0].points as Array<
    { timestamp: number; value: number }
  >;
  assertEquals(point[0].value, 42);
  assert(point[0].timestamp >= before && point[0].timestamp <= after, String(point[0].timestamp));
  assertEquals(String(point[0].timestamp).length, 10, "the timestamp is not in seconds");
});

Deno.test("metric-submit: a JSON string of points is parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await metricSubmit.execute(
    { metric: "m", points: '[{"timestamp": 5, "value": 1}, {"timestamp": 6, "value": 2}]' },
    ctx,
  );
  assertEquals((bodyOf(calls[0]) as unknown as Payload).series[0].points, [
    { timestamp: 5, value: 1 },
    { timestamp: 6, value: 2 },
  ]);
});

Deno.test("metric-submit: tags are split, and optional fields are omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await metricSubmit.execute(
    { metric: "m", points: 1, tags: "env:prod, service:web", type: 3, unit: "byte", interval: 60 },
    ctx,
  );
  const series = (bodyOf(calls[0]) as unknown as Payload).series[0];
  assertEquals(series.tags, ["env:prod", "service:web"]);
  assertEquals(series.type, 3);
  assertEquals(series.unit, "byte");
  assertEquals(series.interval, 60);

  const bare = mockCtx([{ status: 202, body: {} }]);
  await metricSubmit.execute({ metric: "m", points: 1 }, bare.ctx);
  assertEquals(
    Object.keys((bodyOf(bare.calls[0]) as unknown as Payload).series[0]).sort(),
    ["metric", "points"],
  );
});

Deno.test("metric-submit: a host becomes one typed resource, and explicit resources win", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await metricSubmit.execute({ metric: "m", points: 1, host: "web-01" }, ctx);
  assertEquals((bodyOf(calls[0]) as unknown as Payload).series[0].resources, [{
    name: "web-01",
    type: "host",
  }]);

  const override = mockCtx([{ status: 202, body: {} }]);
  await metricSubmit.execute(
    { metric: "m", points: 1, host: "web-01", resources: [{ name: "db-1", type: "database" }] },
    override.ctx,
  );
  assertEquals((bodyOf(override.calls[0]) as unknown as Payload).series[0].resources, [{
    name: "db-1",
    type: "database",
  }]);
});

Deno.test("metric-submit: bad points are refused before anything is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(metricSubmit.execute({ metric: "m", points: "not json" }, ctx)),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

/**
 * Datadog offers no idempotency key here and a `count` metric ADDS on a repeat,
 * so a retried step corrupts the series.
 */
Deno.test("metric-submit: it is a non-idempotent perform", () => {
  assertEquals(metricSubmit.type, "perform");
  assertEquals(metricSubmit.idempotent, false);
});

Deno.test("metric-submit: the points hint states the seconds-and-window rule", () => {
  const hint = metricSubmit.params?.find((p) => p.key === "points")?.hint ?? "";
  assert(hint.includes("seconds, not milliseconds"), hint);
  assert(hint.includes("1 hour in the past"), hint);
});
