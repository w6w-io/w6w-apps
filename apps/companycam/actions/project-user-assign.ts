import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `PUT /v2/projects/{project_id}/assigned_users/{user_id}` — assign a user to a
 * project.
 *
 * No body: the two path ids are the whole request. The documented success
 * status is `201` and the response is the assigned `User`.
 *
 * Idempotent: assigning an already-assigned user leaves them assigned.
 */
interface Input {
  projectId: string;
  userId: string;
  actAs?: string;
}

const projectUserAssign: ActionDefinition<Input> = {
  key: "project-user-assign",
  type: "perform",
  resource: "project",
  title: "Assign User to Project",
  description: "Assign a user of this company to a project.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_address", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/assigned_users/${encodeId(input.userId)}`,
      { method: "PUT", actAs: input.actAs },
    );
  },
};

export default projectUserAssign;
