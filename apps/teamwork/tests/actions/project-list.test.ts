import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs /projects/api/v3/projects.json with filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { projects: [] } }]);
  await action.execute({ searchTerm: "acme", onlyStarredProjects: true, page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/projects.json");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("searchTerm"), "acme");
  assertEquals(url.searchParams.get("onlyStarredProjects"), "true");
  assertEquals(url.searchParams.get("page"), "2");
});

Deno.test("project-list: omits unset filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { projects: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("searchTerm"), false);
  assertEquals(url.searchParams.has("updatedAfter"), false);
});
