import { assert, assertEquals } from "@std/assert";
import projectChecklistList from "../../actions/project-checklist-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-checklist-list: sends no pagination, which this endpoint does not accept", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", name: "Roof survey" }] }]);
  const page = await projectChecklistList.execute({ projectId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/checklists");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(page.count, 1);
});

Deno.test("project-checklist-list: offers only the project id as a param", () => {
  assertEquals(projectChecklistList.params!.map((p) => p.key), ["projectId"]);
  assert(/no pagination/i.test(projectChecklistList.description!));
});
