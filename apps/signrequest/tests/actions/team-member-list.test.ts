import { assertEquals } from "@std/assert";
import teamMemberList from "../../actions/team-member-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-member-list: GETs /team-members/ with is_active and user__email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await teamMemberList.execute({ isActive: true, userEmail: "a@example.com" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/team-members/");
  const q = queryOf(calls[0]);
  assertEquals(q.get("is_active"), "true");
  assertEquals(q.get("user__email"), "a@example.com");
});
