import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `DELETE /v0/users` — remove a member from the community, addressed by
 * email.
 *
 * Heartbeat states the user's threads, comments and messages are **not**
 * removed — only their access. `reactivate-user` reverses this. A delete
 * request is idempotent by HTTP convention: retrying it either repeats the
 * removal or finds the member already gone, never a duplicate side effect.
 */
interface Input {
  email: string;
}

const deleteUser: ActionDefinition<Input> = {
  key: "delete-user",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description:
    "Remove a member from the community. Their threads, comments and messages are kept — only " +
    "access is revoked. Reversible with Reactivate User.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "A 404 is returned if no member has this email.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/users", {
      method: "DELETE",
      body: { email: input.email },
    });
  },
};

export default deleteUser;
