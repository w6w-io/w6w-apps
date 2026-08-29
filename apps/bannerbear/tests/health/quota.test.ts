import { assert, assertEquals } from "@std/assert";
import quota, { WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("health/quota: ok when comfortably under the ceiling", async () => {
  const { ctx, calls } = mockCtx([
    { body: { workspace: "Acme", quota: { max: 1000, current: 10, remaining: 990 } } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/account");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "renders", limit: 1000, remaining: 990, unit: "renders" });
});

Deno.test(`health/quota: degraded at or above ${WARN_FRACTION * 100}%`, async () => {
  const { ctx } = mockCtx([{ body: { quota: { max: 1000, current: 950, remaining: 50 } } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/950\/1000/.test(report.message ?? ""), report.message);
});

Deno.test("health/quota: down when the ceiling is fully consumed", async () => {
  const { ctx } = mockCtx([{ body: { quota: { max: 1000, current: 1000, remaining: 0 } } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/exhausted/i.test(report.message ?? ""), report.message);
});

/** A non-positive ceiling (e.g. Pay As You Go) is "not metered this way", not "0 left". */
Deno.test("health/quota: max of 0 reports ok, not exhausted", async () => {
  const { ctx } = mockCtx([{ body: { quota: { max: 0, current: 0, remaining: 0 } } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
});

Deno.test("health/quota: unknown, not down, when /account fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "no" } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
});

Deno.test("health/quota: unknown when the response carries no quota object", async () => {
  const { ctx } = mockCtx([{ body: { workspace: "Acme" } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
});

Deno.test("health/quota: signed and connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
