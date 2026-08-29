import { assertEquals } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1" } }]);
  await productUpdate.execute({ productId: "prod_1", title: "New Title" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/products/prod_1");
  assertEquals(JSON.parse(calls[0].body!), { title: "New Title" });
});

Deno.test("product-update: metadata accepts a JSON object directly", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "prod_1" } }]);
  await productUpdate.execute({ productId: "prod_1", metadata: { bay: "1" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).metadata, { bay: "1" });
});
