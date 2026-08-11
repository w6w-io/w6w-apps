import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  userId: string;
  role: string;
}

/**
 * `$role` is a `Role!` enum variable, so the value travels as a plain JSON
 * string ("admin" / "user") and is coerced server-side — no literal
 * interpolation into the document.
 */
const MUTATION = `
  mutation SetUserRole($userId: String!, $role: Role!) {
    setUserRole(user_id: $userId, role: $role) {
      name
      email
      is_admin
    }
  }
`;

const userRoleSet: ActionDefinition<Input> = {
  key: "user-role-set",
  type: "perform",
  resource: "user",
  title: "Set User Role",
  description: "Promote a teammate to admin, or demote one to a regular user.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "From `user-list`. Must be someone on your team, or you get `not_in_team`.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
      hint:
        "Demoting the last admin fails with `admin_must_exist`; calling this at all needs admin privileges.",
    },
  ],
  output: [
    { key: "setUserRole.name", type: "string", label: "Name" },
    { key: "setUserRole.email", type: "string", label: "Email" },
    { key: "setUserRole.is_admin", type: "boolean", label: "Is admin" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      userId: input.userId,
      role: input.role,
    });
  },
};

export default userRoleSet;
