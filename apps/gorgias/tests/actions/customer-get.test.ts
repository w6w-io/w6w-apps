import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customers/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 42, email: "jo@acme.test" } }]);
  const out = await action.execute({ customerId: 42 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/customers/42");
  assertEquals(out, { id: 42, email: "jo@acme.test" });
});
