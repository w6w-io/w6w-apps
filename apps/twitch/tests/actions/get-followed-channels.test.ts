import { assertEquals } from "@std/assert";
import getFollowedChannels from "../../actions/get-followed-channels.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-followed-channels: calls GET /helix/channels/followed", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 2, data: [], pagination: {} } }]);
  await getFollowedChannels.execute({ userId: "141981764" }, ctx);

  assertEquals(pathOf(calls[0].url), "/helix/channels/followed");
  assertEquals(queryOf(calls[0].url), { user_id: "141981764" });
});

/**
 * `/channels/followed` and `/channels/followers` differ by one letter and take
 * the same two ids in opposite roles. Pinning the path here is what stops a
 * refactor swapping them into a plausible-looking 200.
 */
Deno.test("get-followed-channels: the follow check goes in broadcaster_id, not user_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 1, data: [], pagination: {} } }]);
  await getFollowedChannels.execute({ userId: "me", broadcasterId: "them", after: "cur" }, ctx);
  assertEquals(pathOf(calls[0].url), "/helix/channels/followed");
  assertEquals(queryOf(calls[0].url), { user_id: "me", broadcaster_id: "them", after: "cur" });
});
