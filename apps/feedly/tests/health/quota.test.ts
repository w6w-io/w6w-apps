import { assert, assertEquals } from "@std/assert";
import quota, { readRateLimitHeaders } from "../../health/quota.ts";
import { PROBE_PATH } from "../../auth/bearer-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: reads the three documented headers, case-insensitively", () => {
  const headers = new Headers({
    "X-RateLimit-Limit": "100000",
    "X-Ratelimit-Count": "57",
    "x-ratelimit-reset": "23841",
  });
  assertEquals(readRateLimitHeaders(headers), { limit: 100000, count: 57, resetSeconds: 23841 });
});

Deno.test("quota: missing headers read as undefined, not zero", () => {
  assertEquals(readRateLimitHeaders(new Headers()), {
    limit: undefined,
    count: undefined,
    resetSeconds: undefined,
  });
});

Deno.test("quota: is signed, connection-scoped, and probes /v3/profile", async () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  const { ctx, calls } = mockCtx([
    { headers: { "x-ratelimit-count": "57", "x-ratelimit-limit": "100000" } },
  ]);
  await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
});

Deno.test("quota: low usage reports ok with the correct remaining count", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-count": "100", "x-ratelimit-limit": "100000" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "monthly-requests",
    limit: 100000,
    remaining: 99900,
    unit: "requests",
  });
});

Deno.test("quota: at or above 90% usage reports degraded", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-count": "90000", "x-ratelimit-limit": "100000" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/90000\/100000/.test(report.message ?? ""), report.message);
});

Deno.test("quota: at 100% usage reports down", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-count": "100000", "x-ratelimit-limit": "100000" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: falls back to the documented 100,000 cap when X-RateLimit-Limit is absent", async () => {
  const { ctx } = mockCtx([{ headers: { "x-ratelimit-count": "5" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].limit, 100_000);
});

Deno.test("quota: a missing X-RateLimit-Count reports unknown", async () => {
  const { ctx } = mockCtx([{ headers: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a non-ok response reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: converts resetSeconds to an ISO resetAt", async () => {
  const { ctx } = mockCtx([
    {
      headers: {
        "x-ratelimit-count": "5",
        "x-ratelimit-limit": "100000",
        "x-ratelimit-reset": "60",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  const resetAt = report.quota?.[0].resetAt;
  assert(resetAt !== undefined);
  assert(!Number.isNaN(Date.parse(resetAt!)), resetAt);
});
