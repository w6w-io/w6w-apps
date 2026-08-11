import { assertEquals } from "@std/assert";
import teamUserRemove from "../../actions/team-user-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-user-remove: DELETEs /api/teams/{team}/users/{teamUser}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "User removed from team" } }]);
  const out = await teamUserRemove.execute({ team: 4, teamUser: 9 }, ctx) as { message: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/teams/4/users/9");
  assertEquals(calls[0].body, null, "a DELETE must not carry a body");
  assertEquals(out.message, "User removed from team");
});

/** Both ids are escaped independently, so neither can rewrite the other's segment. */
Deno.test("team-user-remove: both path ids are escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await teamUserRemove.execute(
    { team: "4/x" as unknown as number, teamUser: "9?y" as unknown as number },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/teams/4%2Fx/users/9%3Fy");
});
