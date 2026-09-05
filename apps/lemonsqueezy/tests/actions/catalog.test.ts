import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import productGet from "../../actions/product-get.ts";
import variantList from "../../actions/variant-list.ts";
import variantGet from "../../actions/variant-get.ts";
import priceList from "../../actions/price-list.ts";
import priceGet from "../../actions/price-get.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("product-list: filter[store_id] survives, include passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await productList.execute({ storeId: "9", include: "variants" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/products");
  assertEquals(url.searchParams.get("filter[store_id]"), "9");
  assertEquals(url.searchParams.get("include"), "variants");
});

Deno.test("product-get: GET /v1/products/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "products" }) }]);
  await productGet.execute({ productId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/products/1");
});

Deno.test("variant-list: filter[product_id] and filter[status] both survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await variantList.execute({ productId: "1", status: "published" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[product_id]"), "1");
  assertEquals(url.searchParams.get("filter[status]"), "published");
});

Deno.test("variant-get: GET /v1/variants/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "variants" }) }]);
  await variantGet.execute({ variantId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/variants/1");
});

Deno.test("price-list: filter[variant_id] survives", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await priceList.execute({ variantId: "7" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter[variant_id]"), "7");
});

Deno.test("price-get: GET /v1/prices/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "prices" }) }]);
  await priceGet.execute({ priceId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/prices/1");
});
