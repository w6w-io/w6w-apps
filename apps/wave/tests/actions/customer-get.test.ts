import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import customerGet from "../../actions/customer-get.ts";

Deno.test("customer-get: returns the customer by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { business: { customer: { id: "c1", name: "Santa", email: "santa@example.com" } } },
    },
  }]);
  const out = await customerGet.execute({ businessId: "b1", customerId: "c1" }, ctx) as {
    name: string;
  };
  assertEquals(out.name, "Santa");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.customerId, "c1");
});

Deno.test("customer-get: a null business throws rather than returning undefined silently", async () => {
  const { ctx } = mockCtx([{ body: { data: { business: null } } }]);
  await assertRejects(async () => {
    await customerGet.execute({ businessId: "bad", customerId: "c1" }, ctx);
  });
});

Deno.test("customer-get: type/resource metadata", () => {
  assertEquals(customerGet.type, "read");
  assertEquals(customerGet.resource, "customer");
});
