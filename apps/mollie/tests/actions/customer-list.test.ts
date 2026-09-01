import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-list: unwraps _embedded.customers", async () => {
  const { ctx, calls } = mockCtx([{ body: list("customers", [{ id: "cst_1" }]) }]);
  const out = await customerList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers");
  assertEquals(out, { count: 1, items: [{ id: "cst_1" }] });
});
