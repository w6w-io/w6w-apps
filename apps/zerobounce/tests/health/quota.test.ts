import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with the remaining balance for a positive Credits value", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 2375323 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/getcredits");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 2375323);
});

Deno.test("quota: reports down when the balance is exactly zero", async () => {
  const { ctx } = mockCtx([{ body: { Credits: 0 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports unknown (not down) when Credits is -1 — a credential problem, not an empty balance", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Credits: -1 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown when the body carries no Credits field", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is a connection-scoped, signed, informational check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
});
