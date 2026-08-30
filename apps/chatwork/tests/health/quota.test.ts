import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: ok when comfortably under the limit", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { account_id: 1 },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "300",
      "x-ratelimit-remaining": "244",
      "x-ratelimit-reset": "1390941626",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    limit: 300,
    remaining: 244,
    unit: "requests",
    resetAt: new Date(1390941626 * 1000).toISOString(),
  });
});

Deno.test("quota: degraded when remaining is at or under the warn fraction", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "20" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: down when the window is exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "0" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

/**
 * Live-confirmed 2026-08-29: an unauthenticated GET /me carries NO
 * X-RateLimit-* headers alongside its 401. A missing header on success must
 * report unknown, never invent a reading of zero headroom.
 */
Deno.test("quota: unknown when a 200 carries no rate-limit headers", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: unknown (not down) on a non-2xx — the headers say nothing about headroom", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Invalid API Token"] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
