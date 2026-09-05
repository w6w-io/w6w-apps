import { assertEquals } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs to /customers/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("customer", { id: 42 }) }]);
  await customerUpdate.execute({ customerId: "42", lastName: "Doe" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/customers/42");
  assertEquals(JSON.parse(calls[0].body!), { last_name: "Doe" });
});

Deno.test("customer-update: is marked idempotent", () => {
  assertEquals(customerUpdate.idempotent, true);
});
