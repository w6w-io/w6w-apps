import { assertEquals } from "@std/assert";
import programAffiliateAdd from "../../actions/program-affiliate-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("program-affiliate-add: nests the affiliate id under {affiliate: {id}}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sandrasanderson", approved: null } }]);
  const out = await programAffiliateAdd.execute(
    {
      programId: "johns-affiliate-program",
      affiliateId: "sandrasanderson",
      coupon: "MIKEFREESHIPPING",
    },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/programs/johns-affiliate-program/affiliates/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    affiliate: { id: "sandrasanderson" },
    coupon: "MIKEFREESHIPPING",
  });
  assertEquals(out.id, "sandrasanderson");
});
