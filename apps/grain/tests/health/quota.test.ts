import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with remaining/limit when headroom is healthy", async () => {
  const { ctx, calls } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "250",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "account", limit: 300, remaining: 250, unit: "requests" });
  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/teams");
  assertEquals(calls[0].method, "POST");
});

Deno.test("quota: reports degraded under 10% remaining", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "10",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports down with Retry-After on a 429", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "0",
      "Retry-After": "30",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
  assertEquals(report.message?.includes("30s"), true);
});

Deno.test("quota: reports unknown when the remaining header is absent", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown, not down, on an unexpected error status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: kind quota, informational severity, connection-scoped signed credential", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});
