import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: lists /customers with only count/skip — no date-range filter exists", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "cust_1" }]) }]);
  await customerList.execute({ count: 25, skip: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/customers");
  assertEquals(queryOf(calls[0].url), { count: "25", skip: "5" });
});
