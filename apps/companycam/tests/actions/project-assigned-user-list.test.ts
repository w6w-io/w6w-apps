import { assertEquals } from "@std/assert";
import projectAssignedUserList from "../../actions/project-assigned-user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-assigned-user-list: lists the company users on a project", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "9" }] }]);
  const page = await projectAssignedUserList.execute({ projectId: "1", perPage: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/assigned_users");
  assertEquals(queryOf(calls[0].url), { per_page: "50" });
  assertEquals(page.count, 1);
});
