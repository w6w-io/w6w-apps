import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("order-list: hits GET /orders with the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "or_1" }]) }]);
  await orderList.execute({ email: "a@b.com", status: "completed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/orders");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com", status: "completed" });
});
