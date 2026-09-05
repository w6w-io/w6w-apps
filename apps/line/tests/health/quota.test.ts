import { assert, assertEquals } from "@std/assert";
import quota, { CONSUMPTION_URL, QUOTA_URL } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: is signed, connection-scoped, no extra network", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: calls both endpoints on the API host", async () => {
  const { ctx, calls } = mockCtx([
    { body: { type: "limited", value: 1000 } },
    { body: { totalUsage: 100 } },
  ]);
  await quota.check!({}, ctx);

  const paths = calls.map((c) => pathOf(c.url)).sort();
  assertEquals(paths, [CONSUMPTION_URL, QUOTA_URL].sort());
});

Deno.test("quota: no configured limit reports ok and states the usage", async () => {
  const { ctx } = mockCtx([
    { body: { type: "none" } },
    { body: { totalUsage: 4200 } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assert(/4200/.test(report.message ?? ""), report.message);
  assert(/no monthly limit/.test(report.message ?? ""), report.message);
});

Deno.test("quota: comfortably under a configured limit reports ok with the reading", async () => {
  const { ctx } = mockCtx([
    { body: { type: "limited", value: 1000 } },
    { body: { totalUsage: 100 } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "monthly-messages",
    limit: 1000,
    remaining: 900,
    unit: "messages",
  }]);
});

Deno.test("quota: at or above 90% of a configured limit reports degraded", async () => {
  const { ctx } = mockCtx([
    { body: { type: "limited", value: 1000 } },
    { body: { totalUsage: 950 } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/950\/1000/.test(report.message ?? ""), report.message);
});

Deno.test("quota: at 100% of a configured limit reports down", async () => {
  const { ctx } = mockCtx([
    { body: { type: "limited", value: 1000 } },
    { body: { totalUsage: 1000 } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
});

/** A limit of zero reads as "not configured", not "exhausted". */
Deno.test("quota: a non-positive configured value is treated as unmetered", async () => {
  const { ctx } = mockCtx([
    { body: { type: "limited", value: 0 } },
    { body: { totalUsage: 5 } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
});

Deno.test("quota: the quota endpoint failing reports unknown", async () => {
  // Both endpoints are fetched concurrently (Promise.all), so both must be queued even though
  // only the first's failure is what this test is pinning.
  const { ctx } = mockCtx([
    { status: 500, body: "" },
    { body: { totalUsage: 5 } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: the consumption endpoint failing reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: { type: "none" } },
    { status: 500, body: "" },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a missing totalUsage reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: { type: "none" } },
    { body: {} },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
