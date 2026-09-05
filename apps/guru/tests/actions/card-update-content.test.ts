import { assertEquals } from "@std/assert";
import cardUpdateContent from "../../actions/card-update-content.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-update-content: PUTs content AND title to the /content endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", content: "new body" } }]);
  const result = await cardUpdateContent.execute(
    { cardId: "c1", title: "Unchanged Title", content: "new body" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/c1/content");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    preferredPhrase: "Unchanged Title",
    content: "new body",
  });
  assertEquals(result, { id: "c1", content: "new body" });
});
