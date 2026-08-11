import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient } from "../lib/client.ts";

/**
 * `DELETE /beta/custom-field-values/project/{projectId}/custom-fields/{valueId}`
 * — clear one custom field value from a project.
 *
 * The project twin of `custom-field-value-delete-task`, and it takes the same
 * `valueId` — the id of the *value*, which Motion documents as distinct from the
 * custom field's own id and from the field name a project's `customFieldValues`
 * record is keyed by.
 *
 * The reference documents no response body, so the status is what is returned.
 * Idempotent: after one call and after five the value is gone.
 */
interface Input {
  projectId: string;
  valueId: string;
}

const customFieldValueDeleteProject: ActionDefinition<Input> = {
  key: "custom-field-value-delete-project",
  type: "perform",
  resource: "custom-field-value",
  title: "Delete Custom Field Value From Project",
  description:
    "Clear one custom field value from a project. Removes the value only — Delete Custom Field " +
    "removes the definition from the whole workspace.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Projects result.",
    },
    {
      key: "valueId",
      label: "Custom field VALUE ID",
      type: "string",
      required: true,
      hint: "The id of the VALUE, which Motion documents as distinct from the custom field's own " +
        "id and from the field name a project's customFieldValues is keyed by.",
    },
  ],
  output: [
    { key: "valueId", type: "string", label: "Custom field value deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Motion custom field value from project", {
      projectId: input.projectId,
    });
    const status = await new MotionClient(ctx).status(
      `${BETA}/custom-field-values/project/${encodeId(input.projectId)}/custom-fields/${
        encodeId(input.valueId)
      }`,
      { method: "DELETE" },
    );
    return { valueId: input.valueId, status };
  },
};

export default customFieldValueDeleteProject;
