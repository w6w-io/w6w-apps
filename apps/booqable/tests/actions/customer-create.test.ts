import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POSTs a JSON:API document to /customers", async () => {
  const { ctx, calls } = mockBooqableCtx([{ status: 201, body: { data: { id: "1" } } }]);
  await action.execute({ name: "Jo Smith", email: "jo@acme.test", tagList: "vip, repeat" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/customers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "customers");
  assertEquals(body.data.attributes.name, "Jo Smith");
  assertEquals(body.data.attributes.email, "jo@acme.test");
  assertEquals(body.data.attributes.tag_list, ["vip", "repeat"]);
  assertEquals("id" in body.data, false);
});
