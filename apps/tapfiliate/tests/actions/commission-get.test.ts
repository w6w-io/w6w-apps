import { assertEquals } from "@std/assert";
import commissionGet from "../../actions/commission-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("commission-get: fetches by numeric id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, amount: 55, approved: true } }]);
  const out = await commissionGet.execute({ commissionId: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/commissions/1/");
  assertEquals(out, { id: 1, amount: 55, approved: true });
});
