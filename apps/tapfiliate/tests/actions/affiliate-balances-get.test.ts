import { assertEquals } from "@std/assert";
import affiliateBalancesGet from "../../actions/affiliate-balances-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-balances-get: returns the currency->amount map, not an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { USD: 5, EUR: 35 } }]);
  const out = await affiliateBalancesGet.execute({ affiliateId: "janejameson" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/balances/");
  assertEquals(out, { balances: { USD: 5, EUR: 35 } });
});
