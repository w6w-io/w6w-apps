import { assertEquals } from "@std/assert";
import boardArticleRemove from "../../actions/board-article-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("board-article-remove: DELETEs the /{streamId}/{entryId} path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await boardArticleRemove.execute(
    { streamId: "enterprise/acme/tag/board-1", entryId: "e1" },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/tags/enterprise%2Facme%2Ftag%2Fboard-1/e1");
});

Deno.test("board-article-remove: is idempotent", () => {
  assertEquals(boardArticleRemove.idempotent, true);
});
