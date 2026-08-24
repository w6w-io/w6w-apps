import { assertEquals } from "@std/assert";
import accountBalanceGet from "../../actions/account-balance-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-balance-get: GETs /v1/account/credit/balance", async () => {
  const { ctx, calls } = mockCtx([{ body: { remainingCredits: 99795868 } }]);
  const out = await accountBalanceGet.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/account/credit/balance");
  assertEquals(calls[0].body, null, "a GET must not carry a body");
  assertEquals(out.remainingCredits, 99795868);
});
