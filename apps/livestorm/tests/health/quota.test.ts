import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: reads both monthly and interval windows from headers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: {
      "ratelimit-monthly-limit": "10000",
      "ratelimit-monthly-remaining": "9000",
      "ratelimit-interval-limit": "10",
      "ratelimit-interval-remaining": "9",
    },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.find((q) => q.id === "monthly")?.remaining, 9000);
  assertEquals(report.quota?.find((q) => q.id === "interval")?.remaining, 9);
});

Deno.test("quota: exhausted interval budget reports down", async () => {
  const { ctx } = mockCtx([{
    headers: {
      "ratelimit-monthly-limit": "10000",
      "ratelimit-monthly-remaining": "9000",
      "ratelimit-interval-limit": "10",
      "ratelimit-interval-remaining": "0",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: low headroom (<10%) reports degraded", async () => {
  const { ctx } = mockCtx([{
    headers: {
      "ratelimit-monthly-limit": "10000",
      "ratelimit-monthly-remaining": "500",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: no RateLimit-* headers at all reports unknown", async () => {
  const { ctx } = mockCtx([{ headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is signed, informational, connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.scope, "connection");
});
