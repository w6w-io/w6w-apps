import { assert, assertEquals } from "@std/assert";
import quota, { CREDIT_USAGE_URL, readBucket } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

function creditBody(stats: Record<string, { limit: number; consumed: number; left_over: number }>) {
  return {
    credit_usage_stats: stats,
    current_credit_cycle: {
      start_date: "2026-08-01T00:00:00.000Z",
      end_date: "2026-08-31T23:59:59.999Z",
    },
  };
}

Deno.test("quota: reads the credit-usage endpoint, signed, on the app's own host", () => {
  assertEquals(CREDIT_USAGE_URL, "https://api.apollo.io/api/v1/usage_stats/credit_usage_stats");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: a healthy team reports ok with a reading per credit type", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: creditBody({
        lead_credit: { limit: 10000, consumed: 2500, left_over: 7500 },
        ai_credit: { limit: 2000, consumed: 75, left_over: 1925 },
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, CREDIT_USAGE_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 2);
  const lead = report.quota?.find((q) => q.id === "lead_credit");
  assertEquals(lead, {
    id: "lead_credit",
    limit: 10000,
    remaining: 7500,
    unit: "credits",
    resetAt: "2026-08-31T23:59:59.999Z",
  });
});

Deno.test("quota: a credit type past 90% reports degraded and names itself", async () => {
  const { ctx } = mockCtx([
    { body: creditBody({ lead_credit: { limit: 100, consumed: 95, left_over: 5 } }) },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/lead_credit at 95\/100 credits \(95%\)/.test(report.message ?? ""), report.message);
});

Deno.test("quota: an exhausted credit type reports down", async () => {
  const { ctx } = mockCtx([
    { body: creditBody({ lead_credit: { limit: 100, consumed: 100, left_over: 0 } }) },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: a zero-limit bucket means unmetered, not exhausted", () => {
  const reading = readBucket("x", { limit: 0, consumed: 5, left_over: 0 }, undefined);
  assertEquals(reading?.state, "ok");
});

Deno.test("quota: usage past the limit never reports a negative remaining", () => {
  const reading = readBucket("x", { limit: 100, consumed: 100, left_over: -20 }, undefined);
  assertEquals(reading?.quota.remaining, 0);
});

Deno.test("quota: a bucket missing limit/consumed is skipped, not guessed at", () => {
  assertEquals(readBucket("x", undefined, undefined), undefined);
  assertEquals(readBucket("x", { limit: 10 }, undefined), undefined);
});

Deno.test("quota: a refused read reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a response with no credit_usage_stats reports unknown", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: reads credit types generically — a vendor-new key still reports", async () => {
  const { ctx } = mockCtx([
    { body: creditBody({ brand_new_credit_type: { limit: 50, consumed: 10, left_over: 40 } }) },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].id, "brand_new_credit_type");
});
