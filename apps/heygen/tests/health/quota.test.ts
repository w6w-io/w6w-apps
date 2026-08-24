import { assert, assertEquals } from "@std/assert";
import quota, { USER_URL } from "../../health/quota.ts";
import requestRate from "../../health/request-rate.ts";
import { envelope, mockCtx } from "../_helpers.ts";

Deno.test("quota: reads the whoami endpoint, signed, on the app's own host", () => {
  assertEquals(USER_URL, "https://api.heygen.com/v3/users/me");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: a wallet account with a positive balance reports ok", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        billing_type: "wallet",
        wallet: { currency: "usd", remaining_balance: 42.5 },
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, USER_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "wallet-balance", remaining: 42.5, unit: "usd" }]);
});

Deno.test("quota: an exhausted wallet reports down", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({ billing_type: "wallet", wallet: { currency: "usd", remaining_balance: 0 } }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/exhausted/.test(report.message ?? ""), report.message);
});

Deno.test("quota: subscription credit pools report the worse of two pools", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        billing_type: "subscription",
        subscription: {
          plan: "team",
          credits: {
            premium_credits: { remaining: 500, resets_at: "2026-09-01T00:00:00Z" },
            add_on_credits: { remaining: 0 },
          },
        },
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.quota?.length, 2);
  const premium = report.quota?.find((q) => q.id === "premium-credits");
  assertEquals(premium, {
    id: "premium-credits",
    remaining: 500,
    unit: "credits",
    resetAt: "2026-09-01T00:00:00Z",
  });
  assert(/add-on credits exhausted/.test(report.message ?? ""), report.message);
});

Deno.test("quota: usage-based with a configured spending cap reports a fraction against it", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        billing_type: "usage_based",
        usage_based: { spending_current_usd: 90, spending_cap_usd: 100 },
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "usage-spend", limit: 100, remaining: 10, unit: "USD" }]);
});

Deno.test("quota: usage-based hitting its spending cap reports down", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        billing_type: "usage_based",
        usage_based: { spending_current_usd: 100, spending_cap_usd: 100 },
      }),
    },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: usage-based with no configured cap falls back to remaining_credits", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope({
        billing_type: "usage_based",
        usage_based: { included_credits: 4444, remaining_credits: 4426.9 },
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    { id: "usage-credits", limit: 4444, remaining: 4426.9, unit: "credits" },
  ]);
});

Deno.test("quota: a refused read reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a response with no data reports unknown", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a billing block with no readable figures reports unknown", async () => {
  const { ctx } = mockCtx([{ body: envelope({ billing_type: "wallet", wallet: {} }) }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

// --- the declared absence ---------------------------------------------------

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so
 * any severity but `informational` would pin the app at `unknown` forever.
 */
Deno.test("request-rate: is a declared absence at informational severity", () => {
  assertEquals(requestRate.severity, "informational");
  assertEquals(typeof requestRate.check, "undefined");
  assert((requestRate.unavailable?.reason ?? "").length > 0);
  assert(
    /Retry-After/.test(requestRate.unavailable?.reason ?? ""),
    "the reason should name the one header HeyGen does send on a 429",
  );
});
