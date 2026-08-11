import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `DELETE /v2/projects/{project_id}/assigned_users/{user_id}` — unassign a user
 * from a project. Answers `204` with no body.
 *
 * This removes the assignment, not the user, and not their photos.
 *
 * Idempotent: removing an assignment that is not there converges on the same
 * state.
 */
interface Input {
  projectId: string;
  userId: string;
  actAs?: string;
}

const projectUserRemove: ActionDefinition<Input> = {
  key: "project-user-remove",
  type: "perform",
  resource: "project",
  title: "Remove Assigned User",
  description: "Remove a user's assignment from a project. Does not delete the user.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    actAsParam,
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(
      `/projects/${encodeId(input.projectId)}/assigned_users/${encodeId(input.userId)}`,
      { method: "DELETE", actAs: input.actAs },
    );
  },
};

export default projectUserRemove;
