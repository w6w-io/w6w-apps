import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-status-transition.ts";

Deno.test("order-status-transition: POSTs /order_status_transitions with from/to and null defaults", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "t1" } } }]);
  await action.execute({ orderId: "o1", transitionFrom: "new", transitionTo: "draft" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/order_status_transitions");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "order_status_transitions");
  assertEquals(body.data.attributes.order_id, "o1");
  assertEquals(body.data.attributes.transition_from, "new");
  assertEquals(body.data.attributes.transition_to, "draft");
  assertEquals(body.data.attributes.confirm_shortage, null);
  assertEquals(body.data.attributes.revert, null);
});

Deno.test("order-status-transition: passes confirmShortage through to override a shortage warning", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "t1" } } }]);
  await action.execute(
    { orderId: "o1", transitionFrom: "draft", transitionTo: "reserved", confirmShortage: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.confirm_shortage, true);
});
