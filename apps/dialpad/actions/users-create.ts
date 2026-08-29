import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";
import { licenseOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/users` — create a new user.
 *
 * No idempotency key is documented, so calling this twice with the same email
 * creates a second user (or fails on the vendor's own email-uniqueness rule) —
 * declared non-idempotent either way.
 */
interface Input {
  email: string;
  officeId: string;
  firstName?: string;
  lastName?: string;
  license?: string;
  autoAssign?: boolean;
}

const usersCreate: ActionDefinition<Input> = {
  key: "users-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a new company user. Requires a company admin API key.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "officeId",
      label: "Office ID",
      type: "string",
      required: true,
      hint: "Look one up with the List Offices action.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "license",
      label: "License",
      type: "select",
      options: licenseOptions,
      hint: "Affects billing for the user. Defaults to talk.",
    },
    {
      key: "autoAssign",
      label: "Auto-assign a number",
      type: "boolean",
      hint: "Automatically assign a phone number to the new user.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "display_name", type: "string", label: "Display name" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating user", { email: input.email });
    return new DialpadClient(ctx).json("/users", {
      method: "POST",
      body: {
        email: input.email,
        office_id: Number(input.officeId),
        first_name: input.firstName,
        last_name: input.lastName,
        license: input.license,
        auto_assign: input.autoAssign,
      },
    });
  },
};

export default usersCreate;
