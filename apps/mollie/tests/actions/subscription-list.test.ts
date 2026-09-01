import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-list: unwraps _embedded.subscriptions for one customer", async () => {
  const { ctx, calls } = mockCtx([{ body: list("subscriptions", [{ id: "sub_1" }]) }]);
  const out = await subscriptionList.execute({ customerId: "cst_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions");
  assertEquals(out, { count: 1, items: [{ id: "sub_1" }] });
});
