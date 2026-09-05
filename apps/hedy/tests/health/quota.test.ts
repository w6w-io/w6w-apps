import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

function headers(overrides: Record<string, string> = {}) {
  return { "content-type": "application/json", ...overrides };
}

Deno.test("quota: calls the cheap /sessions?limit=1 read, same as the auth probe", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { success: true, data: [], pagination: { total: 0 } },
      headers: headers({
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "185",
        "x-ratelimit-reset": "1788606817",
      }),
    },
  ]);
  await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/sessions");
  assertEquals(queryOf(calls[0].url).limit, "1");
});

Deno.test("quota: comfortable headroom reports ok", async () => {
  const { ctx } = mockCtx([
    {
      body: { success: true, data: [] },
      headers: headers({
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "150",
        "x-ratelimit-reset": "1788606817",
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 200);
  assertEquals(report.quota?.[0].remaining, 150);
  assertEquals(report.quota?.[0].resetAt, new Date(1788606817 * 1000).toISOString());
});

Deno.test("quota: 90%+ consumed reports degraded, not down — the window recovers on its own", async () => {
  const { ctx } = mockCtx([
    {
      body: { success: true, data: [] },
      headers: headers({
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "15",
        "x-ratelimit-reset": "1788606817",
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: a fully exhausted window is degraded, never down", async () => {
  const { ctx } = mockCtx([
    {
      body: { success: true, data: [] },
      headers: headers({
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1788606817",
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("exhausted"));
});

Deno.test("quota: missing rate-limit headers report unknown, not a fabricated reading", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: [] }, headers: headers() }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reads even a failure response's headers — the limiter runs before auth", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { success: false, error: { code: "invalid_api_key" } },
      headers: headers({
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "199",
        "x-ratelimit-reset": "1788606817",
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 199);
});

Deno.test("quota: is a signed, connection-scoped check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
});
