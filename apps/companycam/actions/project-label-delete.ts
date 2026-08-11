import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /v2/projects/{project_id}/labels/{id}` — remove one label from a
 * project. Answers `204` with no body.
 *
 * The label id comes from `project-label-list`; this endpoint takes an id where
 * its `POST` sibling takes display strings, which is the asymmetry to watch.
 * Removing a label from a project does not delete the label itself.
 *
 * Idempotent.
 */
interface Input {
  projectId: string;
  labelId: string;
}

const projectLabelDelete: ActionDefinition<Input> = {
  key: "project-label-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project Label",
  description: "Remove one label from a project by label id. The label itself is not deleted.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "labelId",
      label: "Label ID",
      type: "string",
      required: true,
      hint: "From List Project Labels — an id here, unlike Add Labels which takes display values.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(
      `/projects/${encodeId(input.projectId)}/labels/${encodeId(input.labelId)}`,
      { method: "DELETE" },
    );
  },
};

export default projectLabelDelete;
