import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-balance.ts";

Deno.test("get-balance: GETs /user/balance and returns the body verbatim", async () => {
  const body = {
    is_available: true,
    balance_infos: [
      {
        currency: "USD",
        total_balance: "110.00",
        granted_balance: "10.00",
        topped_up_balance: "100.00",
      },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.deepseek.com");
  assertEquals(url.pathname, "/user/balance");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("get-balance: is a read action with no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
});
