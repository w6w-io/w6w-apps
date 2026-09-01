import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: fetches /customers/{id}/subscriptions/{subscriptionId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "active" } }]);
  const out = await subscriptionGet.execute({ customerId: "cst_1", subscriptionId: "sub_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions/sub_1");
  assertEquals(out, { id: "sub_1", status: "active" });
});
