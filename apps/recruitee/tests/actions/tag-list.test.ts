import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: builds the query from every filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tags: [], meta: {} } }]);
  await tagList.execute({ query: "dev", sortBy: "taggings_count", sortOrder: "desc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/c/123/tags");
  assertEquals(queryOf(calls[0].url), {
    query: "dev",
    sort_by: "taggings_count",
    sort_order: "desc",
  });
});
