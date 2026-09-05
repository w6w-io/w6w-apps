import { assertEquals } from "@std/assert";
import balanceList from "../../actions/balance-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("balance-list: lists every non-zero affiliate balance, no query parameters", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ affiliate_id: "janejameson", balances: { USD: 5, EUR: 35 } }] },
  ]);
  const out = await balanceList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/balances/");
  assertEquals(out.items, [{ affiliate_id: "janejameson", balances: { USD: 5, EUR: 35 } }]);
});
