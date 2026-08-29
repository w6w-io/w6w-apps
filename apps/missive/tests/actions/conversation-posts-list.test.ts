import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-posts-list.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-posts-list: lists posts for a conversation", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: [{ id: "p1" }] } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1/posts");
  assertEquals(out, [{ id: "p1" }]);
});

Deno.test("conversation-posts-list: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
