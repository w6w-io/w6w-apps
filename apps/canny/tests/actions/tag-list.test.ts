import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("tag-list: posts filters to /v1/tags/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [], hasMore: false } }]);
  await tagList.execute({ boardID: "b1", limit: 5, skip: 0 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/tags/list");
  assertEquals(bodyOf(calls[0]), { boardID: "b1", limit: 5, skip: 0 });
});
