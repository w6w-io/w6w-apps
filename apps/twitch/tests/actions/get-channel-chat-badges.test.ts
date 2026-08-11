import { assertEquals } from "@std/assert";
import getChannelChatBadges from "../../actions/get-channel-chat-badges.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-channel-chat-badges: calls GET /helix/chat/badges", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ set_id: "subscriber", versions: [{ id: "0", title: "Subscriber" }] }] },
  }]);
  const out = await getChannelChatBadges.execute({ broadcasterId: "135093069" }, ctx) as {
    data: Array<{ set_id: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/chat/badges");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "135093069" });
  assertEquals(out.data[0].set_id, "subscriber");
});

Deno.test("get-channel-chat-badges: an empty list is the ordinary answer for a small channel", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const out = await getChannelChatBadges.execute({ broadcasterId: "1" }, ctx) as {
    data: unknown[];
  };
  assertEquals(out.data, []);
});
