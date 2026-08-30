import type { ActionDefinition } from "@w6w/types";
import { compact, PowerBIClient } from "../lib/client.ts";

interface Input {
  groupId: string;
  identifier: string;
  principalType: "None" | "User" | "Group" | "App";
  groupUserAccessRight: "None" | "Member" | "Admin" | "Contributor" | "Viewer";
  displayName?: string;
  emailAddress?: string;
}

/**
 * `POST /groups/{groupId}/users`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/groups/add-group-user
 *
 * Grants a user, security group, or service principal (`App`) an access
 * right on the workspace. `identifier` is a user principal name / email for
 * `User`, or an object ID for `Group`/`App`.
 *
 * Required scope: `Workspace.ReadWrite.All` (no Read-only alternative).
 *
 * Limitation the reference states: a workspace caps out at 1,000 users/groups
 * across the four roles; the number of members *within* a granted group is
 * not limited by that cap.
 */
const addWorkspaceUser: ActionDefinition<Input> = {
  key: "add-workspace-user",
  type: "perform",
  resource: "workspace",
  title: "Add Workspace User",
  description: "Grant a user, security group or service principal access to a workspace.",
  // Re-granting the same access right to the same identifier converges on
  // the same end state; Power BI does not mint a new membership row per call.
  idempotent: true,
  params: [
    { key: "groupId", label: "Workspace ID", type: "string", required: true },
    {
      key: "identifier",
      label: "Identifier",
      type: "string",
      required: true,
      hint:
        "User principal name / email for a User, or an object ID for a Group or App (service principal).",
    },
    {
      key: "principalType",
      label: "Principal type",
      type: "select",
      required: true,
      default: "User",
      options: [
        { value: "User", label: "User" },
        { value: "Group", label: "Security group" },
        { value: "App", label: "Service principal" },
        { value: "None", label: "None (whole-organization level access)" },
      ],
    },
    {
      key: "groupUserAccessRight",
      label: "Access right",
      type: "select",
      required: true,
      options: [
        { value: "Admin", label: "Admin" },
        { value: "Member", label: "Member (read, reshare, explore)" },
        { value: "Contributor", label: "Contributor (read, explore)" },
        { value: "Viewer", label: "Viewer (read-only)" },
        { value: "None", label: "None (no access)" },
      ],
    },
    {
      key: "displayName",
      label: "Display name",
      type: "string",
      advanced: true,
    },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      advanced: true,
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.status(`/groups/${encodeURIComponent(input.groupId)}/users`, {
      method: "POST",
      body: compact({
        identifier: input.identifier,
        principalType: input.principalType,
        groupUserAccessRight: input.groupUserAccessRight,
        displayName: input.displayName,
        emailAddress: input.emailAddress,
      }),
    });
  },
};

export default addWorkspaceUser;
