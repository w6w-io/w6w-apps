import { assertEquals } from "@std/assert";
import commissionList from "../../actions/commission-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("commission-list: paid renders as 1/0, NOT true/false — the one exception in this API", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await commissionList.execute({ affiliateId: "jane", status: "approved", paid: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/commissions/");
  assertEquals(queryOf(calls[0].url), { affiliate_id: "jane", status: "approved", paid: "0" });
});

Deno.test("commission-list: paid: true renders as 1", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await commissionList.execute({ paid: true }, ctx);
  assertEquals(queryOf(calls[0].url).paid, "1");
});
