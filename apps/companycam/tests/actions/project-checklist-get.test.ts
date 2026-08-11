import { assertEquals } from "@std/assert";
import projectChecklistGet from "../../actions/project-checklist-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-checklist-get: addresses a checklist through its project", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "7", sections: [], sectionless_tasks: [] } }]);
  await projectChecklistGet.execute({ projectId: "1", checklistId: "7" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/checklists/7");
  assertEquals(calls[0].method, "GET");
});

Deno.test("project-checklist-get: declares the sectionless tasks people forget to read", () => {
  const keys = (projectChecklistGet.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("sectionless_tasks"), true);
});
