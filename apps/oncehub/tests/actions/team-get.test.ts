import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-get.ts";

Deno.test("team-get: GETs /teams/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "TM-1" } }]);
  await action.execute({ id: "TM-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/teams/TM-1");
});
