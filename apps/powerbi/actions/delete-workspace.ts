import type { ActionDefinition } from "@w6w/types";
import { PowerBIClient } from "../lib/client.ts";

interface Input {
  groupId: string;
}

interface Output {
  status: number;
}

/**
 * `DELETE /groups/{groupId}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/groups/delete-group
 *
 * Returns `200 OK` with no body. Required scope: `Workspace.ReadWrite.All`.
 */
const deleteWorkspace: ActionDefinition<Input, Output> = {
  key: "delete-workspace",
  type: "perform",
  resource: "workspace",
  title: "Delete Workspace",
  description: "Delete a Power BI workspace.",
  // Deleting an already-deleted workspace answers an error, but the end
  // state — gone — is the same either way.
  idempotent: true,
  params: [
    { key: "groupId", label: "Workspace ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.status(`/groups/${encodeURIComponent(input.groupId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteWorkspace;
