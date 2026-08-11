import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/invitations` — mint a collaboration
 * invitation for a project.
 *
 * **No request body, and no recipient.** The endpoint takes no email address:
 * it returns an `invite_url` and delivering it is your problem. That is why
 * this action exists in a workflow at all — mint the link here, send it with
 * whichever email or SMS app the workflow already uses.
 *
 * The URL is a bearer capability: whoever opens it can join the project. It has
 * an `expires_at`, and the invitation's `status` tracks whether it has been
 * accepted.
 *
 * Not idempotent: every call mints another invitation.
 */
interface Input {
  projectId: string;
  actAs?: string;
}

const projectInvitationCreate: ActionDefinition<Input> = {
  key: "project-invitation-create",
  type: "perform",
  resource: "project",
  title: "Create Project Invitation",
  description:
    "Mint a collaboration invite URL for a project. CompanyCam does not send it — the workflow " +
    "delivers the link.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "invite_url", type: "string", label: "Invite URL (grants project access)" },
    { key: "status", type: "string", label: "Status" },
    { key: "expires_at", type: "number", label: "Expires at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/invitations`,
      { method: "POST", actAs: input.actAs },
    );
  },
};

export default projectInvitationCreate;
