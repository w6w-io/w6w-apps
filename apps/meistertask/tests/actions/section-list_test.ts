import { assertEquals } from "@std/assert";
import sectionList from "../../actions/section-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("section-list: GET /projects/:project_id/sections", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 73, name: "Open" }] }]);
  const out = await sectionList.execute({ projectId: 42, status: "all" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/42/sections");
  assertEquals(queryOf(calls[0].url), { status: "all" });
  assertEquals(out, [{ id: 73, name: "Open" }]);
});
