import { assert, assertEquals } from "@std/assert";
import commentThreadCreate from "../../actions/comment-thread-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-thread-create: anchors a thread to a post-index + selected text", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "t1", draft_id: 12, platform: "x", status: "unresolved", comments: [] },
  }]);
  await commentThreadCreate.execute({
    socialSetId: 4,
    draftId: 12,
    postIndex: 0,
    selectedText: "Excited to share",
    text: "Can we soften this?",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12/comment-threads");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.post_index, 0);
  assertEquals(body.selected_text, "Excited to share");
  assertEquals(body.text, "Can we soften this?");
  assert(!("platform" in body), "platform must be omitted, not sent as undefined");
});

Deno.test("comment-thread-create: an x_article thread omits post_index and sets platform", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "t2", draft_id: 12, platform: "x_article", status: "unresolved", comments: [] },
  }]);
  await commentThreadCreate.execute({
    socialSetId: 4,
    draftId: 12,
    platform: "x_article",
    selectedText: "Great drafts start",
    text: "Nice hook",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.platform, "x_article");
  assert(!("post_index" in body));
});

Deno.test("comment-thread-create: is not idempotent — each call creates a new thread id", () => {
  assertEquals(commentThreadCreate.idempotent, false);
});
