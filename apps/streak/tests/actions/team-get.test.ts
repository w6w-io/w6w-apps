import { assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-get: calls GET /teams/{teamKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Team" } }]);
  await teamGet.execute({ teamKey: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/teams/t1");
});
