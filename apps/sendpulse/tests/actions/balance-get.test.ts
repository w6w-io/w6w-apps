import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/balance-get.ts";

Deno.test("balance-get: GETs /balance and returns the vendor body untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { currency: "USD", balance_currency: 0.02 } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/balance");
  assertEquals(result, { currency: "USD", balance_currency: 0.02 });
});
