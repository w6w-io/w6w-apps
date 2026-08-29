import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

Deno.test("team-list: fetches every team with no params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "team_1" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/teams");
  assertEquals((result as { teams: unknown[] }).teams.length, 1);
});

Deno.test("team-list: defaults to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: null }]);
  assertEquals(await action.execute!({}, ctx), { teams: [] });
});
