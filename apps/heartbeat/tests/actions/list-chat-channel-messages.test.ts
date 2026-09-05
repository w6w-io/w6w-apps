import { assertEquals } from "@std/assert";
import listChatChannelMessages from "../../actions/list-chat-channel-messages.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-chat-channel-messages: passes {data, hasMore} straight through, unlike list-documents", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "m1" }], hasMore: true } }]);
  const out = await listChatChannelMessages.execute(
    { channelID: "ch1", startingAfter: "m0", limit: 10 },
    ctx,
  ) as { data: unknown[]; hasMore: boolean };
  assertEquals(pathOf(calls[0].url), "/v0/chatChannel/ch1/messages");
  assertEquals(queryOf(calls[0].url), { startingAfter: "m0", limit: "10" });
  assertEquals(out.hasMore, true);
  assertEquals(out.data.length, 1);
});
