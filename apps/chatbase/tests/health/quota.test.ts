import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, page } from "../_helpers.ts";

function withRateLimit(limit: number, remaining: number, resetMs = 1770681600000) {
  return {
    body: page([]),
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": String(remaining),
      "x-ratelimit-reset": String(resetMs),
    },
  };
}

Deno.test("quota: probes the same /agents endpoint api-key.ts uses", () => {
  assertEquals(PROBE_PATH, "/agents");
});

Deno.test("quota: plenty of headroom reports ok with a quota reading", async () => {
  const { ctx, calls } = mockCtx([withRateLimit(100, 80)]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url.includes("/agents"), true);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "requests-per-10s",
    limit: 100,
    remaining: 80,
    unit: "requests",
    resetAt: new Date(1770681600000).toISOString(),
  });
});

Deno.test("quota: at or above the warn fraction reports degraded", async () => {
  const { ctx } = mockCtx([withRateLimit(100, 5)]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: zero remaining reports degraded, never down — a 10s window recovers on its own", async () => {
  const { ctx } = mockCtx([withRateLimit(100, 0)]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: a 429 reports degraded and surfaces Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { code: "RATE_LIMIT_TOO_MANY_REQUESTS", message: "Too many requests" } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "0",
      "retry-after": "7",
    },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(/7s/.test(report.message ?? ""), true, report.message);
});

Deno.test("quota: no rate-limit headers reports unknown", async () => {
  const { ctx } = mockCtx([{ body: page([]) }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a 401/403 says nothing about headroom — reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: { code: "AUTH_INVALID_API_KEY", message: "bad key" } } },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
