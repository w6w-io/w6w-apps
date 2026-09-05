import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/payment-list.ts";

Deno.test("payment-list: lists payments via Object Query, bypassing the Invoice Settlement gate", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "pay1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://rest.zuora.com/object-query/payments");
  assertEquals(result.count, 1);
});
