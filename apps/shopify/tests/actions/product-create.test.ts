import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-create.ts";

Deno.test("product-create: POSTs /products.json with the product envelope", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: { id: 1 } } }]);
  await action.execute({ title: "Mug", status: "active" }, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/products.json");
  assertEquals(JSON.parse(calls[0].body!), { product: { title: "Mug", status: "active" } });
});

Deno.test("product-create: maps bodyHtml/productType onto Shopify's snake_case", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", bodyHtml: "<p>hi</p>", productType: "Drinkware" }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.body_html, "<p>hi</p>");
  assertEquals(p.product_type, "Drinkware");
});

Deno.test("product-create: images, handle, metafields pass straight through", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({
    title: "Mug",
    images: [{ src: "https://example.com/mug.jpg" }],
    handle: "mug",
    metafields: [{ key: "care", value: "hand wash", type: "single_line_text_field" }],
  }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.images, [{ src: "https://example.com/mug.jpg" }]);
  assertEquals(p.handle, "mug");
  assertEquals(p.metafields, [{ key: "care", value: "hand wash", type: "single_line_text_field" }]);
});

Deno.test("product-create: published=true sends an ISO published_at, no `published` key", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", published: true }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assert(typeof p.published_at === "string" && !Number.isNaN(Date.parse(p.published_at)));
  assertEquals("published" in p, false);
});

Deno.test("product-create: published=false sends a null published_at, no `published` key", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", published: false }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.published_at, null);
  assertEquals("published" in p, false);
});

Deno.test("product-create: publishedScope forwards as published_scope", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", publishedScope: "global" }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.published_scope, "global");
});

Deno.test("product-create: omits the new fields entirely when unset", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ title: "Mug", status: "active" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { product: { title: "Mug", status: "active" } });
});
