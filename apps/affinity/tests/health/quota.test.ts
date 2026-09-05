import { assertEquals } from "@std/assert";
import quota, { readBucket } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const NOW = Date.parse("2026-09-05T00:00:00Z");

Deno.test("readBucket: ok well under the limit", () => {
  const r = readBucket(
    "api-key-per-minute",
    { limit: 900, remaining: 850, reset: 30 },
    "requests",
    false,
    NOW,
  );
  assertEquals(r?.state, "ok");
  assertEquals(r?.quota.remaining, 850);
});

Deno.test("readBucket: degraded (never down) when a non-monthly bucket is exhausted", () => {
  const r = readBucket(
    "api-key-per-minute",
    { limit: 900, remaining: 0, reset: 5 },
    "requests",
    false,
    NOW,
  );
  assertEquals(r?.state, "degraded");
});

Deno.test("readBucket: down when the monthly bucket is exhausted", () => {
  const r = readBucket(
    "org-monthly",
    { limit: 40000, remaining: 0, reset: 100 },
    "requests",
    true,
    NOW,
  );
  assertEquals(r?.state, "down");
});

Deno.test("readBucket: degraded above the warn threshold", () => {
  const r = readBucket(
    "org-monthly",
    { limit: 40000, remaining: 3000, reset: 100 },
    "requests",
    true,
    NOW,
  );
  assertEquals(r?.state, "degraded");
});

Deno.test("readBucket: a non-positive limit is unmetered (ok), not exhausted", () => {
  const r = readBucket("org-monthly", { limit: 0, remaining: 0 }, "requests", true, NOW);
  assertEquals(r?.state, "ok");
});

Deno.test("readBucket: computes resetAt only for monthly buckets", () => {
  const monthly = readBucket(
    "org-monthly",
    { limit: 100, remaining: 50, reset: 60 },
    "requests",
    true,
    NOW,
  );
  const perMinute = readBucket(
    "api-key-per-minute",
    { limit: 900, remaining: 850, reset: 60 },
    "requests",
    false,
    NOW,
  );
  assertEquals(monthly?.quota.resetAt, new Date(NOW + 60_000).toISOString());
  assertEquals(perMinute?.quota.resetAt, undefined);
});

Deno.test("readBucket: undefined when the bucket is missing required fields", () => {
  assertEquals(readBucket("x", undefined, "requests", false, NOW), undefined);
  assertEquals(readBucket("x", {}, "requests", false, NOW), undefined);
});

Deno.test("check: reports both buckets from one /rate-limit call", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        rate: {
          org_monthly: { limit: 40000, remaining: 39993, reset: 2124845, used: 7 },
          api_key_per_minute: { limit: 900, remaining: 900, reset: 0, used: 0 },
        },
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 2);
  assertEquals(calls[0].url, "https://api.affinity.co/rate-limit");
});

Deno.test("check: unknown when /rate-limit itself errors", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized API Key." }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
