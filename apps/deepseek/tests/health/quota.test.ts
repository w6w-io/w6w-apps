import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: declares kind=quota, informational severity, no extra network.allow", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reports ok with the balance when is_available is true", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        is_available: true,
        balance_infos: [
          {
            currency: "USD",
            total_balance: "110.00",
            granted_balance: "10.00",
            topped_up_balance: "100.00",
          },
        ],
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/user/balance");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "USD", remaining: 110, unit: "USD" });
});

Deno.test("quota: reports down when DeepSeek says the balance is unavailable", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        is_available: false,
        balance_infos: [
          {
            currency: "CNY",
            total_balance: "0.00",
            granted_balance: "0.00",
            topped_up_balance: "0.00",
          },
        ],
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: an empty balance_infos array reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { is_available: true, balance_infos: [] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a non-2xx probe reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unauthorized" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
