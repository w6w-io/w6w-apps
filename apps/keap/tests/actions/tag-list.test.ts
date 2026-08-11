import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { tags: [{ id: "1", name: "VIP" }], next_page_token: "n" };

Deno.test("tag-list: reads the tags collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await tagList.execute({}, ctx) as { count: number; nextPageToken?: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tags");
  assertEquals(out.count, 1);
  assertEquals(out.nextPageToken, "n");
});

Deno.test("tag-list: builds the documented filter clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await tagList.execute({ name: "VIP*", tagIds: "1,2" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "name==VIP*;tag_ids==1,2");
});

/** `category_id==NONE` is a documented sentinel, not an id. */
Deno.test("tag-list: the NONE category sentinel survives as a clause", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await tagList.execute({ categoryId: "NONE" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "category_id==NONE");
});

Deno.test("tag-list: an empty category id removes the clause rather than filtering on it", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await tagList.execute({ categoryId: "" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, undefined);
});
