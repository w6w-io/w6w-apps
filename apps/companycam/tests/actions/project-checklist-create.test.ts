import { assert, assertEquals } from "@std/assert";
import projectChecklistCreate from "../../actions/project-checklist-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-checklist-create: posts the template id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", is_populating: true } }]);
  const checklist = await projectChecklistCreate.execute(
    { projectId: "1", checklistTemplateId: "4156" },
    ctx,
  ) as { is_populating: boolean };
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/checklists");
  assertEquals(bodyOf(calls[0]), { checklist_template_id: "4156" });
  // The vendor builds the checklist asynchronously; the caller has to know.
  assertEquals(checklist.is_populating, true);
});

Deno.test("project-checklist-create: says a template is the only way to create one", () => {
  const template = projectChecklistCreate.params!.find((p) => p.key === "checklistTemplateId")!;
  assertEquals(template.required, true);
  assert(/cannot be defined inline/.test(template.hint!), template.hint);
});
