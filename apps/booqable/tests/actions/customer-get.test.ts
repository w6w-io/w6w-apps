import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customers/{id} with optional include", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "1" } } }]);
  await action.execute({ customerId: "1", include: "tax_region" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/customers/1");
  assertEquals(url.searchParams.get("include"), "tax_region");
});
