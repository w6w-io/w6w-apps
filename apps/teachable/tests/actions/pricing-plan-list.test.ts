import { assertEquals } from "@std/assert";
import pricingPlanList from "../../actions/pricing-plan-list.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("pricing-plan-list: defaults per to 5, the smallest of the three conflicting vendor numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("pricing_plans", []) }]);
  await pricingPlanList.execute({}, ctx);

  assertEquals(queryOf(calls[0].url), { per: "5" });
});
