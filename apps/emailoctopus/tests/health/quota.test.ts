import { assert, assertEquals } from "@std/assert";
import check, { BUCKET_SIZE, headroom, refillAt } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: is a signed connection-scoped informational check with no egress widening", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "signed");
  assertEquals(check.severity, "informational");
  assertEquals(check.network, undefined, "a signed check may not widen the allowlist");
});

Deno.test("quota: probes GET /lists?limit=1 on the app's own host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [] },
    headers: { "content-type": "application/json", "x-ratelimiting-remaining": "97" },
  }]);
  await check.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.emailoctopus.com");
  assertEquals(url.pathname, "/lists");
  assertEquals(url.searchParams.get("limit"), "1");
});

Deno.test("quota: reads the vendor's own X-RateLimitING-Remaining spelling", async () => {
  const { ctx } = mockCtx([{
    body: { data: [] },
    headers: { "x-ratelimiting-remaining": "97" },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota![0].remaining, 97);
  assertEquals(report.quota![0].limit, BUCKET_SIZE);
  assertEquals(report.quota![0].unit, "requests");
});

Deno.test("quota: also accepts the conventional X-RateLimit-Remaining spelling", async () => {
  const { ctx } = mockCtx([{ body: { data: [] }, headers: { "x-ratelimit-remaining": "12" } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.quota![0].remaining, 12);
});

Deno.test("quota: reports unknown rather than inventing a count when no header comes back", async () => {
  const { ctx } = mockCtx([{
    body: { data: [] },
    headers: { "content-type": "application/json" },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("X-RateLimiting-Remaining"));
  assertEquals(report.quota, undefined, "no reading means no fabricated quota entry");
});

Deno.test("quota: a 429 is down and uses the retry header for the reset instant", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { detail: "Too many requests." },
    headers: { "x-ratelimiting-remaining": "0", "x-ratelimit-retry-after": "5" },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota![0].remaining, 0);
  const delta = Date.parse(report.quota![0].resetAt!) - Date.now();
  assert(delta > 3000 && delta <= 6000, `expected ~5s, got ${delta}ms`);
});

Deno.test("quota: a non-429 failure is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("headroom: empty is down, under 10% is degraded, otherwise ok", () => {
  assertEquals(headroom(0), "down");
  assertEquals(headroom(9), "degraded");
  assertEquals(headroom(10), "ok");
  assertEquals(headroom(BUCKET_SIZE), "ok");
});

Deno.test("refillAt: derives the reset instant from the documented 10-per-second refill", () => {
  const now = Date.parse("2026-08-11T00:00:00.000Z");
  // 100 - 90 = 10 tokens missing, at 10/s = 1 second.
  assertEquals(refillAt(90, now), "2026-08-11T00:00:01.000Z");
  // An empty bucket needs the full 100 tokens back: 10 seconds.
  assertEquals(refillAt(0, now), "2026-08-11T00:00:10.000Z");
  assertEquals(refillAt(BUCKET_SIZE, now), "2026-08-11T00:00:00.000Z");
});
