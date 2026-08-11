import { assertEquals } from "@std/assert";
import checklistTemplateList from "../../actions/checklist-template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("checklist-template-list: hits templates/checklists with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "4156", name: "Roof survey" }] }]);
  const page = await checklistTemplateList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/templates/checklists");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(page.count, 1);
  assertEquals(checklistTemplateList.params, []);
});
