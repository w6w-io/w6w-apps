import { assertEquals } from "@std/assert";
import highlightTagGet from "../../actions/highlight-tag-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-tag-get: reads one tag, no trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11311390, name: "philosophy" } }]);
  const out = await highlightTagGet.execute({ highlightId: "59767830", tagId: "11311390" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/59767830/tags/11311390");
  assertEquals(out, { id: 11311390, name: "philosophy" });
});
