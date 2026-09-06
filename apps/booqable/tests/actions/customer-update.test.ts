import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: PUTs a JSON:API document with id to /customers/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "1" } } }]);
  await action.execute({ customerId: "1", name: "Jane Doe" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/customers/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.id, "1");
  assertEquals(body.data.type, "customers");
  assertEquals(body.data.attributes.name, "Jane Doe");
});
