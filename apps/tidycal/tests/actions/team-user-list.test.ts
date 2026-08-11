import { assertEquals } from "@std/assert";
import teamUserList from "../../actions/team-user-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-user-list: calls GET /api/teams/{id}/users", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 9, email: "a@example.com" }]) }]);
  const out = await teamUserList.execute({ team: 4, page: 1 }, ctx) as {
    data: Array<{ id: number }>;
  };

  assertEquals(pathOf(calls[0].url), "/api/teams/4/users");
  assertEquals(queryOf(calls[0].url), { page: "1" });
  // This `id` is a membership id, and it is what Remove user from team takes.
  assertEquals(out.data[0].id, 9);
});
