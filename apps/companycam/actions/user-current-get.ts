import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient } from "../lib/client.ts";

/**
 * `GET /v2/users/current` — the user this connection authenticates as.
 *
 * This is the same endpoint both auth methods probe, and it is the right one to
 * call first in a workflow that impersonates: the impersonation header names
 * *another* user, and this tells you who you would otherwise be.
 *
 * The response carries an email address and a phone number and no credential
 * material — which is what makes it usable as a health probe. Note that this
 * app's `photo`/`document`/`comment` writes credit this user unless the
 * "Attribute to user" param says otherwise.
 */
type Input = Record<string, never>;

const userCurrentGet: ActionDefinition<Input> = {
  key: "user-current-get",
  type: "read",
  resource: "user",
  title: "Retrieve Current User",
  description: "Fetch the user this connection acts as, which is who writes are credited to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(_input, ctx) {
    return new CompanyCamClient(ctx).json("/users/current");
  },
};

export default userCurrentGet;
