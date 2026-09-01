import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: fetches /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust_1", name: "Aisha Sharma" } }]);
  const out = await customerGet.execute({ id: "cust_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/customers/cust_1");
  assertEquals(out, { id: "cust_1", name: "Aisha Sharma" });
});
