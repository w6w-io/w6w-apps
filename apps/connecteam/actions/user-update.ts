import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient } from "../lib/client.ts";
import { userIdParam, userTypeOptions } from "../lib/params.ts";

/**
 * `PUT /users/v1/users` — update one employee's core fields.
 *
 * Wraps a single `UserEditRequest` in a one-element array. Only
 * `manager` <-> `owner` transitions are honoured through `userType` here — a
 * transition crossing the user/manager boundary is rejected by Connecteam
 * with `400`, and must go through the separate admin-invite endpoint this
 * app does not implement (same restriction as `user-create`).
 *
 * Idempotent: setting the same target fields twice leaves the same end
 * state, so a retried step is safe.
 */
interface Input {
  userId: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  userType?: string;
  email?: string;
  isArchived?: boolean;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update one employee's core fields.",
  idempotent: true,
  params: [
    userIdParam,
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    {
      key: "userType",
      label: "User type",
      type: "select",
      options: userTypeOptions,
      hint:
        "Only manager <-> owner transitions apply here; user <-> manager needs the admin-invite flow.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "isArchived", label: "Archived", type: "boolean" },
  ],
  output: [
    { key: "users", type: "array", label: "Updated user(s)" },
    { key: "count", type: "number", label: "Number updated" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data("/users/v1/users", {
      method: "PUT",
      body: [
        compact({
          userId: input.userId,
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: input.phoneNumber,
          userType: input.userType,
          email: input.email,
          isArchived: input.isArchived,
        }),
      ],
    });
  },
};

export default userUpdate;
