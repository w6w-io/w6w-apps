import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-list: filters /subscriptions by plan", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "sub_1" }]) }]);
  await subscriptionList.execute({ planId: "plan_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/subscriptions");
  assertEquals(queryOf(calls[0].url), { plan_id: "plan_1" });
});
