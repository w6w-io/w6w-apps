import { assertEquals, assertRejects } from "@std/assert";
import highlightsCreate from "../../actions/highlights-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlights-create: posts text/position to the bookmark-scoped highlight path", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{
      type: "highlight",
      highlight_id: 7,
      bookmark_id: 42,
      text: "hi",
      position: 2,
      time: 1,
    }]),
  }]);
  const result = await highlightsCreate.execute(
    { bookmarkId: 42, text: "hi", position: 2 },
    ctx,
  ) as {
    highlight_id: number;
  };

  assertEquals(pathOf(calls[0].url), "/api/1.1/bookmarks/42/highlight");
  assertEquals(bodyOf(calls[0]), { text: "hi", position: "2" });
  assertEquals(result.highlight_id, 7);
});

Deno.test("highlights-create: throws if Instapaper returns no highlight", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await highlightsCreate.execute({ bookmarkId: 42, text: "hi" }, ctx),
    Error,
    "no highlight",
  );
});

Deno.test("highlights-create: is not marked idempotent — it always creates a new highlight", () => {
  assertEquals(highlightsCreate.idempotent, false);
});
