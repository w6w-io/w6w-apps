import { assertEquals } from "@std/assert";
import getChatSettings from "../../actions/get-chat-settings.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-chat-settings: calls GET /helix/chat/settings", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ broadcaster_id: "1234", slow_mode: false, slow_mode_wait_time: null }] },
  }]);
  const out = await getChatSettings.execute({ broadcasterId: "1234" }, ctx) as {
    data: Array<Record<string, unknown>>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/chat/settings");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "1234" });
  assertEquals(out.data.length, 1);
});

/**
 * The moderator-only fields are ABSENT, not false, when the token cannot see
 * them — so the action must not fabricate them.
 */
Deno.test("get-chat-settings: absent moderator-only fields stay absent", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ broadcaster_id: "1", emote_mode: false }] } }]);
  const out = await getChatSettings.execute({ broadcasterId: "1" }, ctx) as {
    data: Array<Record<string, unknown>>;
  };
  assertEquals("non_moderator_chat_delay" in out.data[0], false);
  assertEquals("moderator_id" in out.data[0], false);
});

Deno.test("get-chat-settings: moderator_id is sent only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await getChatSettings.execute({ broadcasterId: "1", moderatorId: "2" }, ctx);
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "1", moderator_id: "2" });
});
