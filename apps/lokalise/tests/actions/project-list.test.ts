import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: lists projects with a default limit and no extra filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [{ project_id: "p1" }] } }]);
  const out = await projectList.execute({ limit: 100 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api2/projects");
  assertEquals(queryOf(calls[0].url), { limit: "100" });
  assertEquals(out.items, [{ project_id: "p1" }]);
});

Deno.test("project-list: forwards filters and include flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [] } }]);
  await projectList.execute(
    { filterTeamId: 5, filterNames: "a,b", includeStatistics: true, includeSettings: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    filter_team_id: "5",
    filter_names: "a,b",
    include_statistics: "1",
    include_settings: "0",
  });
});

Deno.test("project-list: cursor pagination switches the query and reports nextCursor", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { projects: [] },
      headers: { "content-type": "application/json", "x-pagination-next-cursor": "cur_1" },
    },
  ]);
  const out = await projectList.execute({ cursor: "cur_0" }, ctx) as { nextCursor?: string };
  assertEquals(queryOf(calls[0].url).pagination, "cursor");
  assertEquals(queryOf(calls[0].url).cursor, "cur_0");
  assertEquals(out.nextCursor, "cur_1");
});
