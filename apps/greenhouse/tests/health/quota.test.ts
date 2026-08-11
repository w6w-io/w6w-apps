import { assert, assertEquals } from "@std/assert";
import quota, { PROBE_URL, WARN_FRACTION } from "../../health/quota.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

function rateHeaders(limit: number, remaining: number, reset = 1786425600) {
  return {
    "content-type": "application/json",
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(reset),
  };
}

Deno.test("quota: is a signed connection-scoped check on the cheapest read", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
  // No `network` widening: the spec binds that to an unsigned posture.
  assertEquals(quota.network, undefined);
  assert(PROBE_URL.endsWith("/v3/user_roles?per_page=1"), PROBE_URL);
});

Deno.test("quota: reads the documented triple and converts the reset to ISO", async () => {
  const { ctx, calls } = mockCtx([{ body: [], headers: rateHeaders(75, 70) }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "requests-30s",
    unit: "requests",
    limit: 75,
    remaining: 70,
    resetAt: new Date(1786425600 * 1000).toISOString(),
  });
});

Deno.test("quota: a nearly-empty window degrades", async () => {
  const remaining = Math.floor(75 * WARN_FRACTION);
  const { ctx } = mockCtx([{ body: [], headers: rateHeaders(75, remaining) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes(`${remaining}/75`), report.message);
});

/**
 * A 30-second fixed window refills itself, so an exhausted one is a burst rather
 * than an outage. Reporting `down` here would page someone for something that
 * fixed itself before they read the alert.
 */
Deno.test("quota: a 429 is degraded, never down, and quotes Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody("Too Many Requests"),
    headers: { ...rateHeaders(75, 0), "retry-after": "8" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("8 seconds"), report.message);
  assertEquals(report.quota?.[0].remaining, 0);
});

/**
 * The vendor documents these headers on *every* response, which is what lets a
 * legitimately-narrow credential still get a real reading instead of a permanent
 * `unknown`.
 */
Deno.test("quota: a 403 still yields a headroom reading, with the reason noted", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("Forbidden"),
    headers: rateHeaders(75, 74),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 74);
  assert(report.message?.includes("does not affect the reading"), report.message);
});

Deno.test("quota: no headers at all is unknown, and says the vendor promised otherwise", async () => {
  const { ctx } = mockCtx([{ body: [], headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("every response"), report.message);
});

Deno.test("quota: an unexpected status is surfaced alongside the reading", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: errorBody("Server error"),
    headers: rateHeaders(75, 70),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("HTTP 500"), report.message);
});
