import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient } from "../lib/client.ts";
import { userTypeOptions } from "../lib/params.ts";

/**
 * `POST /users/v1/users` — create one employee.
 *
 * The vendor endpoint accepts an array of up to 25 users in one call; this
 * action wraps a single `UserCreateRequest` in a one-element array, matching
 * the rest of this app's one-record-per-call shape. `userType` cannot be
 * `manager`/`owner` here to grant admin rights directly — Connecteam's own
 * schema says to create the user first, then promote via the separate
 * `/users/v1/admins` invite endpoint, which this app does not implement.
 *
 * Not idempotent: retrying creates a second employee record, since the API
 * accepts no idempotency key or natural unique constraint (e.g. phone number
 * is not enforced unique across archived/active users).
 */
interface Input {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userType: string;
  email?: string;
  sendActivation?: boolean;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create one employee.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "phoneNumber", label: "Phone number", type: "string", required: true },
    {
      key: "userType",
      label: "User type",
      type: "select",
      required: true,
      default: "user",
      options: userTypeOptions,
      hint: "To grant admin rights, create as 'user' first, then use a separate admin-invite step.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Mandatory if User type is manager or owner.",
    },
    {
      key: "sendActivation",
      label: "Send activation SMS",
      type: "boolean",
      hint: "Off by default.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Created user(s)" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data("/users/v1/users", {
      method: "POST",
      query: { sendActivation: input.sendActivation },
      body: [
        compact({
          firstName: input.firstName,
          lastName: input.lastName,
          phoneNumber: input.phoneNumber,
          userType: input.userType,
          email: input.email,
        }),
      ],
    });
  },
};

export default userCreate;
