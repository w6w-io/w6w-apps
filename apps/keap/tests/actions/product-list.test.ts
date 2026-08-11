import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { products: [{ id: "1", name: "Widget" }], next_page_token: "n" };

Deno.test("product-list: reads the products collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await productList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/products");
  assertEquals(out.count, 1);
});

Deno.test("product-list: builds the documented filter clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await productList.execute({ name: "Wid*", sku: "SKU-1", productIds: "1,2" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "name==Wid*;sku==SKU-1;product_ids==1,2");
});

Deno.test("product-list: no filter at all when nothing was searched for", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await productList.execute({ pageSize: 10 }, ctx);
  assertEquals(queryOf(calls[0].url).filter, undefined);
  assertEquals(queryOf(calls[0].url).page_size, "10");
});
