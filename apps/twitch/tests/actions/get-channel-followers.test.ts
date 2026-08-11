import { assertEquals } from "@std/assert";
import getChannelFollowers from "../../actions/get-channel-followers.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-channel-followers: calls GET /helix/channels/followers", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      total: 8,
      data: [{ user_id: "1", followed_at: "2026-01-01T00:00:00Z" }],
      pagination: {},
    },
  }]);
  const out = await getChannelFollowers.execute({ broadcasterId: "141981764" }, ctx) as {
    total: number;
  };

  assertEquals(pathOf(calls[0].url), "/helix/channels/followers");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "141981764" });
  assertEquals(out.total, 8);
});

/**
 * The trap: without `moderator:read:followers` Twitch still answers 200, with
 * `total` populated and `data` empty. The action must pass that through
 * faithfully rather than mistaking it for "nobody follows this channel".
 */
Deno.test("get-channel-followers: a scope-less 200 with an empty list keeps its total", async () => {
  const { ctx } = mockCtx([{ body: { total: 4127, data: [], pagination: {} } }]);
  const out = await getChannelFollowers.execute({ broadcasterId: "1" }, ctx) as {
    total: number;
    data: unknown[];
  };
  assertEquals(out.total, 4127);
  assertEquals(out.data, []);
});

Deno.test("get-channel-followers: the follow check narrows by user_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 8, data: [], pagination: {} } }]);
  await getChannelFollowers.execute({ broadcasterId: "1", userId: "2", first: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "1", user_id: "2", first: "5" });
});
