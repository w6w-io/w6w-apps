import { assert, assertEquals } from "@std/assert";
import quota, { LIMITS_URL, QUOTA_DIMENSIONS, readDimension } from "../../health/quota.ts";
import requestRate from "../../health/request-rate.ts";
import { envelope, mockCtx } from "../_helpers.ts";

/** Field names taken from the vendor's `Limits` and `Current` schemas. */
function limitsBody(limits: Record<string, number>, current: Record<string, number>) {
  return envelope({
    monthlyUsageCycle: { startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-08-31T23:59:59.999Z" },
    limits,
    current,
  });
}

Deno.test("quota: reads the account-limits endpoint, signed, on the app's own host", () => {
  assertEquals(LIMITS_URL, "https://api.apify.com/v2/users/me/limits");
  assertEquals(quota.credential, "signed");
  // A signed check must not widen egress — that pairing is banned by the spec.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: a healthy account reports ok with a reading per dimension", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: limitsBody(
        { maxMonthlyUsageUsd: 300, maxMonthlyActorComputeUnits: 1000, maxConcurrentActorJobs: 256 },
        { monthlyUsageUsd: 43, monthlyActorComputeUnits: 500, activeActorJobCount: 2 },
      ),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, LIMITS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 3);
  const usd = report.quota?.find((q) => q.id === "monthly-usage-usd");
  assertEquals(usd, {
    id: "monthly-usage-usd",
    limit: 300,
    remaining: 257,
    unit: "USD",
    resetAt: "2026-08-31T23:59:59.999Z",
  });
});

Deno.test("quota: a monthly dimension past 90% reports degraded and names itself", async () => {
  const { ctx } = mockCtx([
    { body: limitsBody({ maxMonthlyUsageUsd: 100 }, { monthlyUsageUsd: 95 }) },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/monthly-usage-usd at 95\/100 USD \(95%\)/.test(report.message ?? ""), report.message);
});

/** Exhausting a monthly allowance stops runs, so it is `down`, not `degraded`. */
Deno.test("quota: an exhausted monthly allowance reports down", async () => {
  const { ctx } = mockCtx([
    { body: limitsBody({ maxMonthlyUsageUsd: 100 }, { monthlyUsageUsd: 100 }) },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

/** Running at the concurrency ceiling is a queue, not an outage. */
Deno.test("quota: a full concurrency ceiling reports degraded, never down", async () => {
  const { ctx } = mockCtx([
    { body: limitsBody({ maxConcurrentActorJobs: 8 }, { activeActorJobCount: 8 }) },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

/**
 * `maxMonthlyUsageUsd` is a ceiling the account owner sets. Reading zero as
 * "exhausted" would report every unlimited account as broken.
 */
Deno.test("quota: a zero ceiling means unconfigured, not exhausted", async () => {
  const { ctx } = mockCtx([
    { body: limitsBody({ maxMonthlyUsageUsd: 0 }, { monthlyUsageUsd: 12 }) },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: usage past the ceiling never reports a negative remaining", () => {
  const reading = readDimension(
    QUOTA_DIMENSIONS[0],
    { maxMonthlyUsageUsd: 100 },
    { monthlyUsageUsd: 130 },
  );
  assertEquals(reading?.quota.remaining, 0);
  assertEquals(reading?.state, "down");
});

Deno.test("quota: a dimension the response omits is skipped, not guessed at", () => {
  assertEquals(readDimension(QUOTA_DIMENSIONS[0], {}, {}), undefined);
  assertEquals(readDimension(QUOTA_DIMENSIONS[0], { maxMonthlyUsageUsd: 10 }, {}), undefined);
});

/**
 * The two objects use different names for the same dimension, and no prefix rule
 * covers both (`maxConcurrentActorJobs` pairs with `activeActorJobCount`). This
 * pins the mapping the vendor's schemas actually specify.
 */
Deno.test("quota: the limit/current key mapping matches the vendor's schemas", () => {
  const byId = Object.fromEntries(QUOTA_DIMENSIONS.map((d) => [d.id, d]));
  assertEquals(byId["monthly-usage-usd"].limitKey, "maxMonthlyUsageUsd");
  assertEquals(byId["monthly-usage-usd"].currentKey, "monthlyUsageUsd");
  assertEquals(byId["concurrent-actor-jobs"].limitKey, "maxConcurrentActorJobs");
  assertEquals(byId["concurrent-actor-jobs"].currentKey, "activeActorJobCount");
  assertEquals(QUOTA_DIMENSIONS.length, 8);
});

/** A scoped token refused the read tells you nothing about headroom. */
Deno.test("quota: a refused read reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a response with no limits block reports unknown", async () => {
  const { ctx } = mockCtx([{ body: envelope({}) }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a response with only unknown dimensions reports unknown", async () => {
  const { ctx } = mockCtx([{ body: limitsBody({ maxSomethingNew: 5 }, { somethingNew: 1 }) }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

// --- the declared absence ---------------------------------------------------

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so any severity but `informational` would pin the app at
 * `unknown` forever.
 */
Deno.test("request-rate: is a declared absence at informational severity", () => {
  assertEquals(requestRate.severity, "informational");
  assertEquals(typeof requestRate.check, "undefined");
  assert((requestRate.unavailable?.reason ?? "").length > 0);
  assert(
    /X-RateLimit-Remaining/i.test(requestRate.unavailable?.reason ?? ""),
    "the reason should name the header Apify does not send",
  );
});
