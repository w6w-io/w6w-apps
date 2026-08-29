import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: fetches /v1/me and maps billing fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: "active",
      billing: { current_balance: 99919.121, refill_to: null },
      total_calls: 9903,
    },
  }]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/me");
  assertEquals(out.status, "active");
  assertEquals(out.currentBalance, 99919.121);
  assertEquals(out.refillTo, undefined);
  assertEquals(out.totalCalls, 9903);
});

Deno.test("account-get: reports refillTo when set", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "active", billing: { current_balance: 10, refill_to: 100 }, total_calls: 1 },
  }]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.refillTo, 100);
});
