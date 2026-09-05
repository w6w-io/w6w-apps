import { assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POSTs to /customers with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope("customer", { id: 1 }) }]);
  await customerCreate.execute(
    { email: "a@b.com", firstName: "Jane", lastName: "Doe", phone: "+16175551212" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(
    JSON.parse(calls[0].body!),
    { email: "a@b.com", first_name: "Jane", last_name: "Doe", phone: "+16175551212" },
  );
});

Deno.test("customer-create: nests externalCustomerId under external_customer_id.ecommerce", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope("customer", { id: 1 }) }]);
  await customerCreate.execute(
    { email: "a@b.com", firstName: "Jane", lastName: "Doe", externalCustomerId: "98273498" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).external_customer_id,
    { ecommerce: "98273498" },
  );
});

Deno.test("customer-create: is a non-idempotent perform action", () => {
  assertEquals(customerCreate.type, "perform");
  assertEquals(customerCreate.idempotent, false);
});
