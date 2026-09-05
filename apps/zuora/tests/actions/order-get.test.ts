import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: retrieves an order via Object Query", async () => {
  const { ctx, calls } = mockCtx([one({ id: "ord1", orderNumber: "O-00000001" })], { display });
  const result = await action.execute!({ orderKey: "O-00000001" }, ctx) as {
    order: { orderNumber: string };
  };
  assertEquals(calls[0].url, "https://rest.zuora.com/object-query/orders/O-00000001");
  assertEquals(result.order.orderNumber, "O-00000001");
});
