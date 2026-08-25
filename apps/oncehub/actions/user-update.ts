import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  roleName?: string;
  teams?: string[];
}

/**
 * PATCH /users/{id}. At least one field is required. The Account Owner role
 * cannot be assigned via the API, and the Account Owner user itself cannot be
 * updated (403). A deleted user returns 410 rather than a normal error.
 * `teams` REPLACES the user's existing team assignments, it does not merge.
 */
const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update an existing user (PATCH /users/{id}). At least one field is required.",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "role_name", type: "string", label: "Role" },
  ],
  params: [
    { key: "id", label: "User ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    {
      key: "roleName",
      label: "Role",
      type: "select",
      options: [
        { label: "Administrator", value: "Administrator" },
        { label: "Member", value: "Member" },
        { label: "Team Manager", value: "Team Manager" },
      ],
    },
    {
      key: "teams",
      label: "Team IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Replaces the user's existing team assignments entirely.",
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/users/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        role_name: input.roleName,
        teams: input.teams,
      },
    });
  },
};

export default userUpdate;
