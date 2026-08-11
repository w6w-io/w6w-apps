import { assertEquals } from "@std/assert";
import getChannelTeams from "../../actions/get-channel-teams.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-channel-teams: calls GET /helix/teams/channel", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "6358", team_name: "livecoders", broadcaster_id: "96909659" }] },
  }]);
  const out = await getChannelTeams.execute({ broadcasterId: "96909659" }, ctx) as {
    data: Array<{ team_name: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/teams/channel");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "96909659" });
  assertEquals(out.data[0].team_name, "livecoders");
});

/** Most broadcasters belong to no team; that is an empty array, not an error. */
Deno.test("get-channel-teams: an empty list is passed through", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const out = await getChannelTeams.execute({ broadcasterId: "1" }, ctx) as { data: unknown[] };
  assertEquals(out.data, []);
});
