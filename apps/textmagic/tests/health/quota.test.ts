import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: reads balance off GET /user", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 208.64, currency: { id: "USD" } } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/user");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 208.64);
  assertEquals(report.quota?.[0].unit, "USD");
});

Deno.test("quota: a zero balance reports down, not degraded", async () => {
  const { ctx } = mockCtx([{ body: { balance: 0, currency: { id: "USD" } } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: a negative balance also reports down", async () => {
  const { ctx } = mockCtx([{ body: { balance: -1.5, currency: { id: "USD" } } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: an HTTP failure is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a body with no numeric balance is unknown", async () => {
  const { ctx } = mockCtx([{ body: { username: "charles.conway" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: signed and connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
