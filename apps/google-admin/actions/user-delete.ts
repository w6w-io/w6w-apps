import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  userKey: string;
}

/**
 * Google's `DELETE /users/{userKey}` fully removes the account (recoverable
 * via `users.undelete` for a limited window, per Google's own docs — not
 * exposed here, see README). There is no soft-delete parameter to set.
 */
const deleteUser: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Permanently delete a user account.",
  idempotent: true,
  params: [
    { key: "userKey", label: "User Key", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    await client.request(`/users/${encodeURIComponent(input.userKey)}`, { method: "DELETE" });
    return { userKey: input.userKey, success: true };
  },
};

export default deleteUser;
