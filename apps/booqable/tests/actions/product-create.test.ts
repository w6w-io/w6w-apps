import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

Deno.test("product-create: POSTs a JSON:API document with product_group_id and variation values", async () => {
  const { ctx, calls } = mockBooqableCtx([{ status: 201, body: { data: { id: "p1" } } }]);
  await action.execute({ productGroupId: "pg1", variationValues: "red" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/products");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "products");
  assertEquals(body.data.attributes.product_group_id, "pg1");
  assertEquals(body.data.attributes.variation_values, ["red"]);
});
