import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

Deno.test("product-update: PUTs a JSON:API document with id to /products/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "p1" } } }]);
  await action.execute({ productId: "p1", basePriceInCents: 1500 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/products/p1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.id, "p1");
  assertEquals(body.data.attributes.base_price_in_cents, 1500);
});
