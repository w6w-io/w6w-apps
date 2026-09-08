import { assert, assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-update.ts";

Deno.test("product-update: PUTs the id plus only the supplied fields", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, status: "archived" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { product: { id: 5, status: "archived" } });
});

Deno.test("product-update: warns that tags replace rather than append", () => {
  assert(action.params?.find((p) => p.key === "tags")?.hint?.includes("REPLACES"));
});

Deno.test("product-update: images and handle pass straight through", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({
    productId: 5,
    images: [{ src: "https://example.com/mug.jpg" }],
    handle: "mug",
  }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.images, [{ src: "https://example.com/mug.jpg" }]);
  assertEquals(p.handle, "mug");
});

Deno.test("product-update: published=true sends an ISO published_at, no `published` key", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, published: true }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assert(typeof p.published_at === "string" && !Number.isNaN(Date.parse(p.published_at)));
  assertEquals("published" in p, false);
});

Deno.test("product-update: published=false sends a null published_at, no `published` key", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, published: false }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.published_at, null);
  assertEquals("published" in p, false);
});

Deno.test("product-update: publishedScope forwards as published_scope", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, publishedScope: "web" }, ctx);
  const p = JSON.parse(calls[0].body!).product;
  assertEquals(p.published_scope, "web");
});

Deno.test("product-update: does not ship metafields (deferred to a dedicated resource)", () => {
  assertEquals(action.params?.find((p) => p.key === "metafields"), undefined);
});

Deno.test("product-update: omits the new fields entirely when unset", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: {} } }]);
  await action.execute({ productId: 5, status: "archived" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { product: { id: 5, status: "archived" } });
});
