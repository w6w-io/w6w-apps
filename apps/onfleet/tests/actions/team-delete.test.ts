import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-delete.ts";

Deno.test("team-delete: sends DELETE and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ teamId: "team_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/teams/team_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("team-delete: teamId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "teamId");
  assertEquals(calls.length, 0);
});
