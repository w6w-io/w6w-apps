import { assertEquals } from "@std/assert";
import action from "../../actions/team-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-update: patches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { teams: [{ id: "t1", name: "New" }] } }]);
  const out = await action.execute({ id: "t1", name: "New" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/teams/t1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out, { id: "t1", name: "New" });
});

Deno.test("team-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
