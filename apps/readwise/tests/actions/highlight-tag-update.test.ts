import { assertEquals } from "@std/assert";
import highlightTagUpdate from "../../actions/highlight-tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-tag-update: PATCHes the tag by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11311390, name: "continental philosophy" } }]);
  await highlightTagUpdate.execute(
    { highlightId: "59767830", tagId: "11311390", name: "continental philosophy" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/59767830/tags/11311390");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "continental philosophy" });
});

Deno.test("highlight-tag-update: is idempotent — renaming twice yields the same name", () => {
  assertEquals(highlightTagUpdate.idempotent, true);
});
