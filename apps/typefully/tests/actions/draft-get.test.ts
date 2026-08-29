import { assertEquals } from "@std/assert";
import draftGet from "../../actions/draft-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("draft-get: fetches one draft by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12, status: "draft" } }]);
  const out = await draftGet.execute({ socialSetId: 4, draftId: 12 }, ctx) as { id: number };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.id, 12);
});

Deno.test("draft-get: passes exclude_comment_markers through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12 } }]);
  await draftGet.execute({ socialSetId: 4, draftId: 12, excludeCommentMarkers: true }, ctx);
  assertEquals(queryOf(calls[0].url).exclude_comment_markers, "true");
});
