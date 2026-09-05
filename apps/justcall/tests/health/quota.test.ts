import { assert, assertEquals } from "@std/assert";
import quota, { QUOTA_URL, readWindow, WARN_FRACTION } from "../../health/quota.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

function headers(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-rate-limit-limit": "1800",
    "x-rate-limit-remaining": "1799",
    "x-rate-limit-reset": "1893456000",
    "x-rate-limit-burst-limit": "30",
    "x-rate-limit-burst-remaining": "29",
    "x-rate-limit-burst-reset": "1893452400",
    ...overrides,
  };
}

Deno.test("quota: reuses the auth probe's own endpoint", () => {
  assertEquals(QUOTA_URL, "https://api.justcall.io/v2.1/users?per_page=1");
  assertEquals(quota.credential, "signed");
});

Deno.test("quota: a healthy account with plenty of headroom reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }]), headers: headers() }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/users");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 2);
});

Deno.test("quota: neither header pair present reports unknown, not zero headroom", async () => {
  const { ctx } = mockCtx([{
    body: envelope([{ id: 1 }]),
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/did not return/i.test(report.message ?? ""), report.message);
});

Deno.test("quota: a non-2xx response says nothing about headroom", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "failed", message: "Unauthorized" } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
});

Deno.test("quota: an exhausted hourly window is down, not degraded", () => {
  const reading = readWindow("hourly-requests", { limit: 1800, remaining: 0, reset: 0 }, true);
  assertEquals(reading.state, "down");
});

/** The burst window recovers within a minute on its own — it is a queue, not an outage. */
Deno.test("quota: an exhausted burst window is degraded, not down", () => {
  const reading = readWindow(
    "burst-requests-per-minute",
    { limit: 30, remaining: 0, reset: 0 },
    false,
  );
  assertEquals(reading.state, "degraded");
});

Deno.test("quota: low but nonzero remaining crosses the warn fraction into degraded", () => {
  const limit = 1800;
  const remaining = Math.floor(limit * (WARN_FRACTION - 0.01));
  const reading = readWindow("hourly-requests", { limit, remaining, reset: 0 }, true);
  assertEquals(reading.state, "degraded");
});

Deno.test("quota: comfortable remaining reports ok", () => {
  const reading = readWindow("hourly-requests", { limit: 1800, remaining: 1000, reset: 0 }, true);
  assertEquals(reading.state, "ok");
});

Deno.test("quota: resetAt is derived from the epoch-seconds reset header", () => {
  const reading = readWindow(
    "hourly-requests",
    { limit: 1800, remaining: 900, reset: 1893456000 },
    true,
  );
  assertEquals(reading.quota.resetAt, new Date(1893456000 * 1000).toISOString());
});
