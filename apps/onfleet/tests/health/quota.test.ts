import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: is informational and never worsens a roll-up", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});

Deno.test("quota: reads X-RateLimit-* headers off /auth/test", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { message: "ok" },
    headers: { "x-ratelimit-limit": "20", "x-ratelimit-remaining": "18" },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/auth/test");
  assertEquals(result.state, "ok");
  assertEquals(result.quota, [{ limit: 20, remaining: 18, unit: "requests" }]);
});

Deno.test("quota: near-zero remaining is degraded, zero is down", async () => {
  const low = mockCtx([{
    status: 200,
    headers: { "x-ratelimit-limit": "20", "x-ratelimit-remaining": "1" },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const empty = mockCtx([{
    status: 200,
    headers: { "x-ratelimit-limit": "20", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "down");
});

Deno.test("quota: no rate-limit headers at all is unknown, not assumed healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: { "content-type": "application/json" } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/did not return/.test(result.message!), result.message);
});

Deno.test("quota: a failed probe is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503 }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a network failure is reported, not thrown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network down")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof quota.check>>[1];
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/could not reach Onfleet/.test(result.message!), result.message);
});
