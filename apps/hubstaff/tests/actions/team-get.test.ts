import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/team-get.ts";

Deno.test("team-get: GETs /v2/teams/{team_id}", async () => {
  const body = envelope("team", { id: 5, name: "Delivery", metadata: {} });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ team_id: 5 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/teams/5");
  assertEquals(result.team.name, "Delivery");
});
