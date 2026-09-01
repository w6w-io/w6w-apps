import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: fetches /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cst_1", name: "Ada" } }]);
  const out = await customerGet.execute({ customerId: "cst_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1");
  assertEquals(out, { id: "cst_1", name: "Ada" });
});
