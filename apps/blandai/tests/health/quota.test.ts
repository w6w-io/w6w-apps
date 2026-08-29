import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: ok with healthy balance and active status", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: 42.5, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://api.bland.ai/v1/me");
  assertEquals(report.quota?.[0].remaining, 42.5);
  assertEquals(report.quota?.[0].unit, "credits");
  assertEquals(report.quota?.[0].limit, undefined);
});

Deno.test("quota: reports the refill_to figure as limit when present", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: 10, refill_to: 100 } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].limit, 100);
});

Deno.test("quota: down when the balance is exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: 0, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(/exhausted/.test(report.message ?? ""), true);
});

Deno.test("quota: down on a negative balance too, and remaining floors at zero", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: -3, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
});

Deno.test("quota: degraded on a low-but-positive balance", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: 0.5, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(/low/.test(report.message ?? ""), true);
});

Deno.test("quota: degraded when the account status is not active, even with a healthy balance", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "flagged", billing: { current_balance: 999, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(/account status: flagged/.test(report.message ?? ""), true);
});

Deno.test("quota: exhausted balance wins over a merely-flagged status", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "flagged", billing: { current_balance: 0, refill_to: null } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: unknown on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: "error", message: "flagged" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: unknown when the response carries no billing.current_balance", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "active" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is signed and scoped per connection", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
