import { assertEquals } from "@std/assert";
import boardArticleAdd from "../../actions/board-article-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-article-add: PUTs the entryId body to the board's stream path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await boardArticleAdd.execute(
    { streamId: "enterprise/acme/tag/board-1", entryId: "e1" },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/tags/enterprise%2Facme%2Ftag%2Fboard-1");
  assertEquals(JSON.parse(calls[0].body!), { entryId: "e1" });
});

Deno.test("board-article-add: is idempotent", () => {
  assertEquals(boardArticleAdd.idempotent, true);
});
