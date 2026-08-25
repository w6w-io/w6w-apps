import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  email: string;
  firstName: string;
  lastName: string;
  roleName?: string;
  teams?: string[];
}

/**
 * POST /users — invites a new user (sends an invitation email). Defaults to
 * the Member role; the Account Owner role can never be assigned via the API.
 * User limits apply per plan (500 purchased / 30 trial).
 */
const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Add User",
  description: "Invite a new user to the account (POST /users).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "role_name", type: "string", label: "Role" },
  ],
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
    {
      key: "roleName",
      label: "Role",
      type: "select",
      default: "Member",
      options: [
        { label: "Administrator", value: "Administrator" },
        { label: "Member", value: "Member" },
        { label: "Team Manager", value: "Team Manager" },
      ],
      hint: "Account Owner cannot be assigned through the API.",
    },
    {
      key: "teams",
      label: "Team IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Team external IDs to add the user to (e.g. TM-GCJU8DLBTPY1). Each must already exist.",
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/users", {
      method: "POST",
      body: {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        role_name: input.roleName,
        teams: input.teams,
      },
    });
  },
};

export default userCreate;
