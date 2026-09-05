import { assertEquals } from "@std/assert";
import balanceGet from "../../actions/balance-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("balance-get: GETs /profiles/{profileId}/balances/{balanceId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, currency: "EUR" } }]);
  const out = await balanceGet.execute({ profileId: 1, balanceId: 2 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/balances/2");
  assertEquals(out.id, 2);
});
