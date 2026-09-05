import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: GET /customers/{customerId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 100, firstname: "Jordan" } }]);
  const result = await customerGet.execute({ customerId: 100 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/customers/100");
  assertEquals(result, { id: 100, firstname: "Jordan" });
});
