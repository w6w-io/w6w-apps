import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: pages the company vocabulary and offers no search", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", display_value: "Roof" }] }]);
  const page = await tagList.execute({ page: 2, perPage: 100 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tags");
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "100" });
  assertEquals(page.count, 1);
  assertEquals(tagList.params!.map((p) => p.key), ["page", "perPage"]);
});
