import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `PUT /v2/users/{id}` — change a user's details.
 *
 * **The body is flat here and nested on create.** `POST /v2/users` wants
 * `{"user": {…}}`; this endpoint wants the fields at the top level. That is the
 * vendor's own schema, not a simplification, and sending the nested shape here
 * is a request that succeeds and changes nothing.
 *
 * `user_role` is absent from this body: a role is create-only.
 *
 * Idempotent: the fields named are set to the values given.
 */
interface Input {
  userId: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  actAs?: string;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user's name, email, phone or password. The role cannot be changed.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "emailAddress", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    {
      key: "password",
      label: "Password",
      type: "secret",
      advanced: true,
      hint: "Sets the user's login password. Prefer CompanyCam's own reset flow.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      email_address: input.emailAddress,
      phone_number: input.phoneNumber,
      password: input.password,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — set at least one field");
    }

    return new CompanyCamClient(ctx).json(`/users/${encodeId(input.userId)}`, {
      method: "PUT",
      body,
      actAs: input.actAs,
    });
  },
};

export default userUpdate;
