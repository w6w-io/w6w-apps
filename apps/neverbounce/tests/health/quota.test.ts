import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with the summed paid+free remaining balance", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      credits_info: { paid_credits_remaining: 9950791, free_credits_remaining: 10 },
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v4.2/account/info");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 9950801);
});

Deno.test("quota: reports down when the balance is exactly zero", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: "success",
      credits_info: { paid_credits_remaining: 0, free_credits_remaining: 0 },
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports unknown (not down) on status auth_failure — a credential problem, not an empty balance", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "auth_failure" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown when the body carries no status field", async () => {
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
