import { assertEquals } from "@std/assert";
import conversionCommissionsAdd from "../../actions/conversion-commissions-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversion-commissions-add: posts to the commissions sub-resource and returns the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 3, amount: 2 }, { id: 4, amount: 1 }] }]);
  const out = await conversionCommissionsAdd.execute(
    { conversionId: 1, conversionSubAmount: 20, commissionType: "standard", comment: "Awesome!" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/1/commissions/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    conversion_sub_amount: 20,
    commission_type: "standard",
    comment: "Awesome!",
  });
  assertEquals(out.items, [{ id: 3, amount: 2 }, { id: 4, amount: 1 }]);
});
