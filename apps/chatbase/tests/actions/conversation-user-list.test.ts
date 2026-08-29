import { assertEquals } from "@std/assert";
import conversationUserList from "../../actions/conversation-user-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("conversation-user-list: GET .../users/{userId}/conversations", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "c1", userId: "user_1" }]) }]);
  const out = await conversationUserList.execute(
    { agentId: "a1", userId: "user_1" },
    ctx,
  ) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/users/user_1/conversations");
  assertEquals(out.data.length, 1);
});
