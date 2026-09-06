import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-group-update.ts";

Deno.test("product-group-update: PUTs a JSON:API document with id to /product_groups/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "pg1" } } }]);
  await action.execute({ productGroupId: "pg1", name: "iPad mini 2" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/product_groups/pg1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.id, "pg1");
  assertEquals(body.data.attributes.name, "iPad mini 2");
});
