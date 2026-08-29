import { assert, assertEquals } from "@std/assert";
import draftUpdate from "../../actions/draft-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("draft-update: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12, status: "draft" } }]);
  await draftUpdate.execute({ socialSetId: 4, draftId: 12, draftTitle: "New title" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { draft_title: "New title" });
});

Deno.test('draft-update: the literal "null" clears publish_at/plan_at, unlike an omitted field', async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12 } }]);
  await draftUpdate.execute({ socialSetId: 4, draftId: 12, publishAt: "null" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.publish_at, null);
  assert(!("plan_at" in body), "plan_at must stay untouched when never provided");
});

Deno.test("draft-update: a real datetime is passed through unchanged, not treated as the clear sentinel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12 } }]);
  await draftUpdate.execute(
    { socialSetId: 4, draftId: 12, planAt: "2027-12-20T09:00:00-05:00" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.plan_at, "2027-12-20T09:00:00-05:00");
});

Deno.test("draft-update: forceOverwriteComments and excludeCommentMarkers reach the right places", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12 } }]);
  await draftUpdate.execute({
    socialSetId: 4,
    draftId: 12,
    forceOverwriteComments: true,
    excludeCommentMarkers: true,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.force_overwrite_comments, true);
  assertEquals(new URL(calls[0].url).searchParams.get("exclude_comment_markers"), "true");
});

Deno.test("draft-update: is not idempotent — it can trigger a real publish", () => {
  assertEquals(draftUpdate.idempotent, false);
});
