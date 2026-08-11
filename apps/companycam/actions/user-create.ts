import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/users` — add a user to the company.
 *
 * **The body nests under `user`, and its sibling `PUT /v2/users/{id}` does
 * not.** Create sends `{"user": {"first_name": …}}`; update sends
 * `{"first_name": …}` flat. Two endpoints, one resource, two body shapes — get
 * it wrong and the API accepts the request and changes nothing, because a
 * Rails-style permit filter silently drops what it does not recognise.
 *
 * `user_role` is create-only: `standard` (the default) or `restricted`. There
 * is no documented way to change a role afterwards.
 *
 * The optional `password` is a real password for a real login. It is declared
 * `secret` so the host masks and encrypts it, but a workflow that can avoid
 * setting one should — leave it empty and let CompanyCam take the user through
 * its own invitation flow.
 *
 * Not idempotent: a retry creates a second user (or fails on a duplicate email,
 * which the vendor does not document either way).
 */
interface Input {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  userRole?: string;
  actAs?: string;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Add a user to the company. The role can only be set at creation.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "emailAddress", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    {
      key: "userRole",
      label: "Role",
      type: "select",
      options: [
        { value: "standard", label: "Standard (default)" },
        { value: "restricted", label: "Restricted" },
      ],
      hint: "Create-only — the documented API offers no way to change a role later.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      advanced: true,
      hint: "Optional, and best left empty: setting one here puts a real login password into " +
        "the workflow. Leave it out to let CompanyCam invite the user instead.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const user = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      email_address: input.emailAddress,
      phone_number: input.phoneNumber,
      password: input.password,
      user_role: input.userRole,
    });
    if (Object.keys(user).length === 0) {
      throw new Error("Set at least one field — a user with no name or email is not useful");
    }

    return new CompanyCamClient(ctx).json("/users", {
      method: "POST",
      body: { user },
      actAs: input.actAs,
    });
  },
};

export default userCreate;
