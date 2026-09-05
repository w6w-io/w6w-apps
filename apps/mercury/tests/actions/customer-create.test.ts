import { assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POSTs /ar/customers with name/email, no address key when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust_new" } }]);
  await customerCreate.execute({ name: "Acme", email: "ap@acme.test" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/customers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Acme");
  assertEquals(body.email, "ap@acme.test");
  assertEquals("address" in body, false);
});

Deno.test("customer-create: builds the nested address object when any address field is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerCreate.execute(
    { name: "Acme", email: "ap@acme.test", city: "NYC", country: "US" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.address.city, "NYC");
  assertEquals(body.address.country, "US");
});
