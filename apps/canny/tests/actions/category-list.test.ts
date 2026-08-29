import { assertEquals } from "@std/assert";
import categoryList from "../../actions/category-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("category-list: posts filters to /v1/categories/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [], hasMore: false } }]);
  await categoryList.execute({ boardID: "b1", limit: 5, skip: 10 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/categories/list");
  assertEquals(bodyOf(calls[0]), { boardID: "b1", limit: 5, skip: 10 });
});

Deno.test("category-list: boardID is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  await categoryList.execute({}, ctx);

  assertEquals(bodyOf(calls[0]), {});
});
