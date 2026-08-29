import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-drafts-list.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-drafts-list: lists drafts for a conversation", async () => {
  const { ctx, calls } = mockCtx([{ body: { drafts: [{ id: "d1" }] } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1/drafts");
  assertEquals(out, [{ id: "d1" }]);
});

Deno.test("conversation-drafts-list: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
