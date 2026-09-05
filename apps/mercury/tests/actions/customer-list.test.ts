import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-list: GETs /ar/customers", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [{ id: "cust_1" }], page: {} } }]);
  const out = await customerList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/customers");
  assertEquals((out.items as unknown[]).length, 1);
});
