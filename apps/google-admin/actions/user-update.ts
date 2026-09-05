import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  userKey: string;
  primaryEmail?: string;
  givenName?: string;
  familyName?: string;
  orgUnitPath?: string;
  suspended?: boolean;
  password?: string;
}

const updateUser: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Patch a user's fields. Only the fields supplied are changed.",
  idempotent: true,
  params: [
    { key: "userKey", label: "User Key", type: "string", required: true },
    { key: "primaryEmail", label: "Primary Email", type: "string" },
    { key: "givenName", label: "First Name", type: "string" },
    { key: "familyName", label: "Last Name", type: "string" },
    { key: "orgUnitPath", label: "Org Unit Path", type: "string" },
    { key: "suspended", label: "Suspended", type: "boolean" },
    { key: "password", label: "New Password", type: "secret" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.primaryEmail !== undefined) body.primaryEmail = input.primaryEmail;
    if (input.givenName !== undefined || input.familyName !== undefined) {
      body.name = {
        ...(input.givenName !== undefined ? { givenName: input.givenName } : {}),
        ...(input.familyName !== undefined ? { familyName: input.familyName } : {}),
      };
    }
    if (input.orgUnitPath !== undefined) body.orgUnitPath = input.orgUnitPath;
    if (input.suspended !== undefined) body.suspended = input.suspended;
    if (input.password !== undefined) body.password = input.password;
    return client.request(`/users/${encodeURIComponent(input.userKey)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateUser;
