import { assert, assertEquals } from "@std/assert";
import quota, { resetAtOf } from "../../health/quota.ts";
import { mockCtx, okBody } from "../_helpers.ts";

Deno.test("quota: reports ok with a credits reading when the balance is positive", async () => {
  const { ctx } = mockCtx([{ body: okBody({ data: { total_credits: 500 } }) }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0], { id: "credits", remaining: 500, unit: "credits" });
});

Deno.test("quota: reports down when the account has no spendable credits", async () => {
  const { ctx } = mockCtx([{ body: okBody({ data: { total_credits: 0 } }) }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(/no spendable credits/.test(out.message ?? ""), out.message);
});

Deno.test("quota: surfaces pro_monthly_credits as limit only when positive", async () => {
  const { ctx } = mockCtx([{
    body: okBody({ data: { total_credits: 10, pro_monthly_credits: 1000 } }),
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.quota?.[0].limit, 1000);
});

Deno.test("quota: a non-2xx response is unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "forbidden" }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("resetAtOf: converts next_refresh_time to ISO only when a refresh_interval is set", () => {
  assertEquals(
    resetAtOf({ total_credits: 1, refresh_interval: "daily", next_refresh_time: 1_700_000_000 }),
    new Date(1_700_000_000 * 1000).toISOString(),
  );
  assertEquals(
    resetAtOf({ total_credits: 1, refresh_interval: "", next_refresh_time: 1_700_000_000 }),
    undefined,
  );
  assertEquals(resetAtOf({ total_credits: 1 }), undefined);
});

Deno.test("quota: this app's Auth test hook reads the same endpoint (declared here, asserted there)", () => {
  // See tests/auth/api-key.test.ts — kept as a documented cross-reference,
  // not a duplicate assertion.
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
