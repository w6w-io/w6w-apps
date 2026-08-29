import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-messages-list.ts";
import { assertActionRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-messages-list: lists messages for a conversation", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [{ id: "m1" }] } }]);
  const out = await action.execute({ id: "c1", limit: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1/messages");
  assertEquals(queryOf(calls[0].url), { limit: "10" });
  assertEquals(out, [{ id: "m1" }]);
});

Deno.test("conversation-messages-list: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
