import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: GETs /ar/customers/{customerId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust_1", name: "Acme" } }]);
  const out = await customerGet.execute({ customerId: "cust_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/customers/cust_1");
  assertEquals((out.customer as { name: string }).name, "Acme");
});
