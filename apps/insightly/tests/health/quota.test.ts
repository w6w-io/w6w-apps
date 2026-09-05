import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, mockInsightlyCtx } from "../_helpers.ts";

Deno.test("quota: is an informational, signed connection check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: unknown when the connection records no pod", async () => {
  const { ctx } = mockCtx();
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: reads limit/remaining off X-RateLimit-* headers", async () => {
  const { ctx, calls } = mockInsightlyCtx([{
    body: { USER_ID: 1 },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "950",
    },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Users/Me");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "instance", limit: 1000, remaining: 950, unit: "requests" }]);
});

Deno.test("quota: degraded under 10% headroom, down at zero", async () => {
  const low = mockInsightlyCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "50" },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const empty = mockInsightlyCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "down");
});

Deno.test("quota: unknown when the header is missing or the probe fails", async () => {
  const noHeader = mockInsightlyCtx([{
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  assertEquals((await quota.check!({}, noHeader.ctx)).state, "unknown");

  const failed = mockInsightlyCtx([{ status: 401, body: {} }]);
  assertEquals((await quota.check!({}, failed.ctx)).state, "unknown");
});
