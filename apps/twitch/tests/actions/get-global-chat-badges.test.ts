import { assertEquals } from "@std/assert";
import getGlobalChatBadges from "../../actions/get-global-chat-badges.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-global-chat-badges: calls GET /helix/chat/badges/global with no query", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{
        set_id: "vip",
        versions: [{ id: "1", title: "VIP", image_url_4x: "https://static-cdn.jtvnw.net/x/3" }],
      }],
    },
  }]);
  const out = await getGlobalChatBadges.execute({}, ctx) as {
    data: Array<{ set_id: string; versions: unknown[] }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/chat/badges/global");
  assertEquals(new URL(calls[0].url).search, "");
  // The two-level shape is the thing to preserve: images live on the versions.
  assertEquals(out.data[0].set_id, "vip");
  assertEquals(out.data[0].versions.length, 1);
});
