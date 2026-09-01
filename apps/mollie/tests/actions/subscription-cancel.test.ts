import { assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: sends DELETE to /customers/{id}/subscriptions/{subscriptionId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "canceled" } }]);
  const out = await subscriptionCancel.execute(
    { customerId: "cst_1", subscriptionId: "sub_1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/subscriptions/sub_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: "sub_1", status: "canceled" });
});

Deno.test("subscription-cancel: is idempotent", () => {
  assertEquals(subscriptionCancel.idempotent, true);
});
