import { assertEquals } from "@std/assert";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-cancel: cancels immediately with no body by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "cancelled" } }]);
  await subscriptionCancel.execute({ id: "sub_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/sub_1/cancel");
  assertEquals(calls[0].body, null);
});

Deno.test("subscription-cancel: cancelAtCycleEnd sends cancel_at_cycle_end=1, an integer not a boolean", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", status: "active" } }]);
  await subscriptionCancel.execute({ id: "sub_1", cancelAtCycleEnd: true }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { cancel_at_cycle_end: 1 });
});
