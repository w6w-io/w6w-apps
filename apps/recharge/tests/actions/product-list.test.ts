import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list: hits GET /products with comma-separated external ids", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("products", [{ id: 1 }]) }]);
  const out = await productList.execute({ externalProductIds: "123,223" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/products");
  assertEquals(queryOf(calls[0].url), { external_product_ids: "123,223" });
  assertEquals(out.items, [{ id: 1 }]);
});
