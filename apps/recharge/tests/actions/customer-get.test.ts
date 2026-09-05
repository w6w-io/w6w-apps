import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-get: hits GET /customers/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("customer", { id: 42, email: "jane@example.com" }) },
  ]);
  const out = await customerGet.execute({ customerId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/customers/42");
  assertEquals(out, { id: 42, email: "jane@example.com" });
});

Deno.test("customer-get: URL-encodes the customer id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("customer", { id: 1 }) }]);
  await customerGet.execute({ customerId: "with space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/customers/with%20space");
});
