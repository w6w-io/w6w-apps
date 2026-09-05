import { assertEquals } from "@std/assert";
import affiliateProgramsList from "../../actions/affiliate-programs-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-programs-list: lists the affiliate's program affiliations", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "johns-affiliate-program", approved: true, coupon: "JANE10OFF" }] },
  ]);
  const out = await affiliateProgramsList.execute({ affiliateId: "u_JaN3-J0n" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/u_JaN3-J0n/programs/");
  assertEquals(out.items, [{ id: "johns-affiliate-program", approved: true, coupon: "JANE10OFF" }]);
});
