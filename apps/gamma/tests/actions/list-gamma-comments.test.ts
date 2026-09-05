import { assertEquals } from "@std/assert";
import listGammaComments from "../../actions/list-gamma-comments.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-gamma-comments: calls GET /gammas/{id}/comments with pagination params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  await listGammaComments.execute(
    { gammaId: "g_1", limit: 20, updatedSince: "2026-01-01T00:00:00Z" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/comments");
  assertEquals(queryOf(calls[0].url), { limit: "20", updatedSince: "2026-01-01T00:00:00Z" });
});
