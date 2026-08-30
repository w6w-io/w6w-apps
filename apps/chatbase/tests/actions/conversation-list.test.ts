import { assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: GET /agents/{id}/conversations", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "c1" }]) }]);
  const out = await conversationList.execute({ agentId: "a1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations");
  assertEquals(out.data.length, 1);
});

Deno.test("conversation-list: forwards cursor/limit", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await conversationList.execute({ agentId: "a1", cursor: "cur1", limit: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { cursor: "cur1", limit: "10" });
});
