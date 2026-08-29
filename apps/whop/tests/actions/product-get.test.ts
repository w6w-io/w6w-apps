import { assert, assertEquals } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-get: GETs /products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1", title: "Interior Deep Clean" } }]);
  const out = await productGet.execute({ productId: "prod_1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/products/prod_1");
  assertEquals(out.id, "prod_1");
});

Deno.test("product-get: declares requiresAuth false — it is a public read", () => {
  assert(productGet.requiresAuth === false);
});
