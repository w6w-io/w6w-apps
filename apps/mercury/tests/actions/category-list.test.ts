import { assertEquals } from "@std/assert";
import categoryList from "../../actions/category-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-list: GETs /categories", async () => {
  const { ctx, calls } = mockCtx([{
    body: { categories: [{ id: "cat_1", name: "Software" }], page: {} },
  }]);
  const out = await categoryList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/categories");
  assertEquals((out.items as unknown[]).length, 1);
});
