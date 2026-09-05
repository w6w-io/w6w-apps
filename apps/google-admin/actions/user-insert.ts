import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  primaryEmail: string;
  givenName: string;
  familyName: string;
  password?: string;
  orgUnitPath?: string;
  changePasswordAtNextLogin?: boolean;
  suspended?: boolean;
}

const insertUser: ActionDefinition<Input> = {
  key: "user-insert",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Provision a new user in the domain.",
  idempotent: false,
  params: [
    { key: "primaryEmail", label: "Primary Email", type: "string", required: true },
    { key: "givenName", label: "First Name", type: "string", required: true },
    { key: "familyName", label: "Last Name", type: "string", required: true },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint:
        "Plaintext at rest is not accepted — leave blank to have Google require a reset on first login.",
    },
    { key: "orgUnitPath", label: "Org Unit Path", type: "string", hint: "e.g. `/Sales`." },
    {
      key: "changePasswordAtNextLogin",
      label: "Require password change at next login",
      type: "boolean",
      default: false,
    },
    { key: "suspended", label: "Suspended", type: "boolean", default: false },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const body: Record<string, unknown> = {
      primaryEmail: input.primaryEmail,
      name: { givenName: input.givenName, familyName: input.familyName },
    };
    if (input.password !== undefined) body.password = input.password;
    if (input.orgUnitPath !== undefined) body.orgUnitPath = input.orgUnitPath;
    if (input.changePasswordAtNextLogin !== undefined) {
      body.changePasswordAtNextLogin = input.changePasswordAtNextLogin;
    }
    if (input.suspended !== undefined) body.suspended = input.suspended;
    return client.request("/users", { method: "POST", body });
  },
};

export default insertUser;
