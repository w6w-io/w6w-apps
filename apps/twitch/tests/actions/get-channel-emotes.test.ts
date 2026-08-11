import { assertEquals } from "@std/assert";
import getChannelEmotes from "../../actions/get-channel-emotes.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-channel-emotes: calls GET /helix/chat/emotes", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{
        id: "304456832",
        name: "twitchdevPitchfork",
        emote_type: "subscriptions",
        tier: "1000",
      }],
      template:
        "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}",
    },
  }]);
  const out = await getChannelEmotes.execute({ broadcasterId: "141981764" }, ctx) as {
    data: Array<{ tier: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/chat/emotes");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "141981764" });
  assertEquals(out.data[0].tier, "1000");
});

/** A broadcaster with no custom emotes is the common case, not an error. */
Deno.test("get-channel-emotes: an empty list is passed through", async () => {
  const { ctx } = mockCtx([{ body: { data: [], template: "x" } }]);
  const out = await getChannelEmotes.execute({ broadcasterId: "1" }, ctx) as { data: unknown[] };
  assertEquals(out.data, []);
});
