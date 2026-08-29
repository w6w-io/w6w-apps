import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-get.ts";

Deno.test("team-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "team_1", name: "Sunset" } }]);
  await action.execute!({ teamId: "team_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/teams/team_1");
});

Deno.test("team-get: teamId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "teamId");
  assertEquals(calls.length, 0);
});
