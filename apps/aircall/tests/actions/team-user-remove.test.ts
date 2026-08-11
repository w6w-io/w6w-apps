import { assertEquals } from "@std/assert";
import teamUserRemove from "../../actions/team-user-remove.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-user-remove: DELETEs /v1/teams/{team}/users/{user}", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("team", { id: 679, users: [] }) }]);
  const out = await teamUserRemove.execute({ teamId: "679", userId: "456" }, ctx) as {
    users: unknown[];
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/teams/679/users/456");
  assertEquals(out.users.length, 0);
});
