import { assertEquals } from "@std/assert";
import action from "../../actions/team-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-list: lists teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { teams: [{ id: "t1" }] } }]);
  const out = await action.execute({ organization: "org-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/teams");
  assertEquals(out, [{ id: "t1" }]);
});
