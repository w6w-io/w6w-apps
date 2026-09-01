import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { DOCUMENTED_LIMIT, readHeadroom } from "../../health/quota.ts";

Deno.test("quota: probes GET /v2/user for the rate-limit headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { users: [{ email: "john@acme.com" }] },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "3600",
      "x-ratelimit-remaining": "3599",
    },
  }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/user");
});

Deno.test("quota: reports ok with plenty of headroom", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "3600", "x-ratelimit-remaining": "3000" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests-per-hour",
    limit: 3600,
    remaining: 3000,
    unit: "requests",
  }]);
});

Deno.test("quota: reports degraded within 10% of the ceiling", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "3600", "x-ratelimit-remaining": "300" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports degraded, never down, when fully exhausted (self-healing hourly window)", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: { "x-ratelimit-limit": "3600", "x-ratelimit-remaining": "0" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports unknown when Drip sends no remaining header", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown (not degraded) when the probe itself fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("readHeadroom: falls back to the documented ceiling when Drip omits the limit header", () => {
  const headers = new Headers({ "x-ratelimit-remaining": "10" });
  const reading = readHeadroom(headers);
  assertEquals(reading.quota?.[0].limit, DOCUMENTED_LIMIT);
});
