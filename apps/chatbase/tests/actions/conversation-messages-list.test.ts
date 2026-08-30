import { assertEquals } from "@std/assert";
import conversationMessagesList from "../../actions/conversation-messages-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-messages-list: GET .../messages, forwards cursor for the next OLDER page", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: "m1" }], { cursor: "older", hasMore: true }),
  }]);
  const out = await conversationMessagesList.execute(
    { agentId: "a1", conversationId: "c1", cursor: "here" },
    ctx,
  ) as { pagination: { cursor: string } };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations/c1/messages");
  assertEquals(queryOf(calls[0].url), { cursor: "here" });
  assertEquals(out.pagination.cursor, "older");
});
