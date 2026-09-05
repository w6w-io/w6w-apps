import { assertEquals } from "@std/assert";
import projectMembersList from "../../actions/project-members-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-members-list: GET /projects/:id/members", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { project_rights: [], project_memberships: [], persons: [] } },
  ]);
  const out = await projectMembersList.execute({ id: 4, includePersons: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/4/members");
  assertEquals(queryOf(calls[0].url), { include_persons: "true" });
  assertEquals(out, { project_rights: [], project_memberships: [], persons: [] });
});
