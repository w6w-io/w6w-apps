import { assertEquals } from "@std/assert";
import planCreate from "../../actions/plan-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-create: posts to /plans, nesting the priced item under item{}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plan_1", period: "monthly" } }]);
  await planCreate.execute(
    { period: "monthly", interval: 1, itemName: "Pro Plan", amount: 49900 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/plans");
  assertEquals(JSON.parse(calls[0].body!), {
    period: "monthly",
    interval: 1,
    item: { name: "Pro Plan", amount: 49900, currency: "INR" },
  });
});
