import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/checklists` — put a checklist on a project
 * from a template.
 *
 * A checklist can only be created **from a template** here — the body is
 * `{"checklist_template_id": "…"}` and there is no way to define tasks inline.
 * Get the id from `checklist-template-list`.
 *
 * The response comes back with `is_populating: true`: CompanyCam copies the
 * template's sections and tasks asynchronously, so the returned checklist can
 * legitimately have no tasks yet. Re-read it with `project-checklist-get`
 * before acting on its contents.
 *
 * Not idempotent: a retry puts a second copy of the checklist on the project.
 */
interface Input {
  projectId: string;
  checklistTemplateId: string;
  actAs?: string;
}

const projectChecklistCreate: ActionDefinition<Input> = {
  key: "project-checklist-create",
  type: "perform",
  resource: "checklist",
  title: "Create Project Checklist",
  description: "Create a checklist on a project from a checklist template.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "checklistTemplateId",
      label: "Checklist template ID",
      type: "string",
      required: true,
      hint: "From List Checklist Templates. Checklists cannot be defined inline.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_populating", type: "boolean", label: "Still being built from the template" },
    { key: "sections", type: "array", label: "Sections" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/checklists`, {
      method: "POST",
      body: { checklist_template_id: input.checklistTemplateId },
      actAs: input.actAs,
    });
  },
};

export default projectChecklistCreate;
