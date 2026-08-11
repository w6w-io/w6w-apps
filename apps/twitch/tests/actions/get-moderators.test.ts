import { assertEquals } from "@std/assert";
import getModerators from "../../actions/get-moderators.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("get-moderators: calls GET /helix/moderation/moderators", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ user_id: "424596340", user_login: "quotrok" }]),
  }]);
  const out = await getModerators.execute({ broadcasterId: "141981764" }, ctx) as {
    data: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/helix/moderation/moderators");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "141981764" });
  assertEquals(out.data.length, 1);
});

/** The membership check is the cheap use: repeated user_id keys, ordered reply. */
Deno.test("get-moderators: the membership check repeats user_id", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getModerators.execute({ broadcasterId: "1", userId: "10,20,30", first: 100 }, ctx);

  assertEquals(queryAll(calls[0].url, "user_id"), ["10", "20", "30"]);
  assertEquals(queryOf(calls[0].url).first, "100");
});
