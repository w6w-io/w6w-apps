import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/order-list.ts";

Deno.test("order-list: lists orders via Object Query, bypassing the Order Metrics gate", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "ord1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://rest.zuora.com/object-query/orders");
  assertEquals(result.count, 1);
});
