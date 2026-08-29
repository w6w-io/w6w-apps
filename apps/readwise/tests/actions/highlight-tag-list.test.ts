import { assertEquals } from "@std/assert";
import highlightTagList from "../../actions/highlight-tag-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("highlight-tag-list: GETs the tag collection without a trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "philosophy" }]) }]);
  const out = await highlightTagList.execute({ highlightId: "59767830" }, ctx) as { count: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/59767830/tags");
  assertEquals(out.count, 1);
});
