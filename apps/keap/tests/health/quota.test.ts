import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import quota, { judgeReading, QUOTA_PROBE_URL, WARN_FRACTION } from "../../health/quota.ts";
import { emptyQuotaHeaders, mockCtx, pathOf, quotaHeaders } from "../_helpers.ts";

Deno.test("quota: the probe is the identity endpoint, and it is signed", () => {
  assertEquals(QUOTA_PROBE_URL, "https://api.infusionsoft.com/crm/rest/v2/oauth/connect/userinfo");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  // A signed check must not widen egress.
  assertEquals(quota.network, undefined);
});

// --- the arithmetic ---------------------------------------------------------

Deno.test("judgeReading is ok well below the threshold", () => {
  const out = judgeReading({ id: "x", limit: 1000, available: 900, window: "1 minute" });
  assertEquals(out.state, "ok");
  assertEquals(out.quota.limit, 1000);
  assertEquals(out.quota.remaining, 900);
  assertEquals(out.quota.id, "x (per 1 minute)");
  assertEquals(out.note, undefined);
});

Deno.test("judgeReading degrades at the warning fraction and not before", () => {
  assertEquals(WARN_FRACTION, 0.9);
  // 89% consumed.
  assertEquals(judgeReading({ id: "x", limit: 100, available: 11 }).state, "ok");
  // Exactly 90%.
  const at = judgeReading({ id: "x", limit: 100, available: 10 });
  assertEquals(at.state, "degraded");
  assertStringIncludes(at.note!, "90%");
});

Deno.test("judgeReading reports an exhausted bucket as down", () => {
  const out = judgeReading({ id: "x", limit: 100, available: 0 });
  assertEquals(out.state, "down");
  assertStringIncludes(out.note!, "exhausted");
});

Deno.test("judgeReading never reports a negative remaining", () => {
  assertEquals(judgeReading({ id: "x", limit: 100, available: -5 }).quota.remaining, 0);
});

/**
 * A missing or non-positive limit is "not metered on this dimension", not "no
 * headroom". Reading it the other way reports every unmetered family exhausted.
 */
Deno.test("judgeReading treats a missing or zero limit as unmetered, not exhausted", () => {
  assertEquals(judgeReading({ id: "x", available: 5 }).state, "ok");
  assertEquals(judgeReading({ id: "x", limit: 0, available: 0 }).state, "ok");
});

Deno.test("judgeReading falls back to `used` when the vendor sent no `available`", () => {
  const out = judgeReading({ id: "x", limit: 100, used: 95 });
  assertEquals(out.state, "degraded");
  assertEquals(out.quota.remaining, undefined);
});

Deno.test("judgeReading is unknown when a limit exists but nothing counts against it", () => {
  assertEquals(judgeReading({ id: "x", limit: 100 }).state, "unknown");
});

// --- the check --------------------------------------------------------------

Deno.test("quota: a healthy response reports all four windows", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" }, headers: quotaHeaders() }]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/oauth/connect/userinfo");
  assertEquals(report.state, "ok");
  assertEquals(
    report.quota!.map((q) => q.id),
    [
      "product-quota (per 1 day)",
      "product-throttle (per 1 minute)",
      "tenant-throttle (per 1 minute)",
      "tenant-throttle[1] (per 1 day)",
    ],
  );
});

/**
 * The tenant ceiling is shared with every other integration on the same Keap
 * app, so it can run out for reasons that have nothing to do with this
 * connection. Collapsing the families would hide exactly that case.
 */
Deno.test("quota: the tenant ceiling can be exhausted while the credential's own is fine", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: quotaHeaders({ "x-keap-tenant-throttle-available": "0|249999" }),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertStringIncludes(report.message!, "tenant-throttle (per 1 minute) exhausted");
  // The credential's own daily bucket is still reported as healthy alongside it.
  const daily = report.quota!.find((q) => q.id === "product-quota (per 1 day)")!;
  assertEquals(daily.remaining, 149999);
});

Deno.test("quota: a 429 is itself the reading, and its headers are still parsed", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { fault: { faultstring: "Rate limit" } },
    headers: quotaHeaders({ "x-keap-product-throttle-available": "0" }),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertStringIncludes(report.message!, "currently throttling");
  assert(report.quota!.length > 0);
});

Deno.test("quota: any other failure is unknown, never a quota verdict", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "500");
});

/**
 * The header set an unauthenticated response carries: every name present, every
 * number blank, and the tenant family a bare `|`. Reporting zeroes from that
 * would say "quota exhausted" about a request that never authenticated.
 */
Deno.test("quota: blank headers report unknown rather than zero headroom", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: emptyQuotaHeaders() }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "no populated x-keap-* quota headers");
});
