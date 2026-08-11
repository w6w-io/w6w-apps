import { assertEquals } from "@std/assert";
import photoTagList from "../../actions/photo-tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("photo-tag-list: lists a photo's tags", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", display_value: "Front Side" }] }]);
  const page = await photoTagList.execute({ photoId: "9", perPage: 100 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/9/tags");
  assertEquals(queryOf(calls[0].url), { per_page: "100" });
  assertEquals(page.count, 1);
});
