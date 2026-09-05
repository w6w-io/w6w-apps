import { assertEquals } from "@std/assert";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("order-get: hits GET /orders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "or_1", status: "completed" } }]);
  const result = await orderGet.execute({ orderId: "or_1" }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v1/orders/or_1");
  assertEquals(result.status, "completed");
});
