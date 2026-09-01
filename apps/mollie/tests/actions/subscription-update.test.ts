import { assertEquals } from "@std/assert";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-update: patches given fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "active" } }]);
  await subscriptionUpdate.execute(
    { customerId: "cst_1", subscriptionId: "sub_1", description: "New description" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions/sub_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { description: "New description" });
});

Deno.test("subscription-update: is idempotent", () => {
  assertEquals(subscriptionUpdate.idempotent, true);
});
