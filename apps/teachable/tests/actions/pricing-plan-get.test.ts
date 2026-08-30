import { assertEquals } from "@std/assert";
import pricingPlanGet from "../../actions/pricing-plan-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pricing-plan-get: fetches the plan by ID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("pricing_plan", { id: 6 }) }]);
  await pricingPlanGet.execute({ pricingPlanId: 6 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pricing_plans/6");
});
