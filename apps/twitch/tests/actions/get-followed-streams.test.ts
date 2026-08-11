import { assertEquals } from "@std/assert";
import getFollowedStreams from "../../actions/get-followed-streams.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-followed-streams: calls GET /helix/streams/followed", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "1", user_login: "afro" }]) }]);
  const out = await getFollowedStreams.execute({ userId: "141981764" }, ctx) as {
    data: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/helix/streams/followed");
  assertEquals(queryOf(calls[0].url), { user_id: "141981764" });
  assertEquals(out.data.length, 1);
});

Deno.test("get-followed-streams: paging is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getFollowedStreams.execute({ userId: "1", first: 50, after: "cur" }, ctx);
  assertEquals(queryOf(calls[0].url), { user_id: "1", first: "50", after: "cur" });
});
