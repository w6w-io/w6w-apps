import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: hits /api/tags with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "vip" }]) }]);
  await tagList.execute({ query: "vip", limit: 50, order: "desc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/tags");
  assertEquals(queryOf(calls[0].url), { query: "vip", limit: "50", order: "desc" });
});
