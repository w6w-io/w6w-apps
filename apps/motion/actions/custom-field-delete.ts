import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

/**
 * `DELETE /beta/workspaces/{workspaceId}/custom-fields/{id}` — remove a custom
 * field definition from a workspace.
 *
 * This deletes the **definition**, not one task's value — that is
 * `custom-field-value-delete-task`. Removing a definition necessarily removes it
 * from every task and project in the workspace that carried a value for it.
 *
 * The reference documents no response body, so the status is what is returned.
 * Idempotent: after one call and after five the definition is gone.
 */
interface Input {
  workspaceId: string;
  id: string;
}

const customFieldDelete: ActionDefinition<Input> = {
  key: "custom-field-delete",
  type: "perform",
  resource: "custom-field",
  title: "Delete Custom Field",
  description:
    "Delete a custom field DEFINITION from a workspace. To clear one task's value instead, use " +
    "Delete Custom Field Value From Task.",
  idempotent: true,
  params: [
    workspaceIdParam(true),
    {
      key: "id",
      label: "Custom field ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Custom Fields result.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Custom field deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Motion custom field", { id: input.id });
    const status = await new MotionClient(ctx).status(
      `${BETA}/workspaces/${encodeId(input.workspaceId)}/custom-fields/${encodeId(input.id)}`,
      { method: "DELETE" },
    );
    return { id: input.id, status };
  },
};

export default customFieldDelete;
