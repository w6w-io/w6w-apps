import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `POST /v0/users/reactivate` — restore access after Delete User.
 *
 * A state transition (deleted -> active) rather than a resource creation:
 * calling it again on an already-active member reaches the same end state, so
 * it is safe to retry.
 */
interface Input {
  email: string;
}

const reactivateUser: ActionDefinition<Input> = {
  key: "reactivate-user",
  type: "perform",
  resource: "user",
  title: "Reactivate User",
  description: "Restore a previously-deleted member's access to the community.",
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
    return new HeartbeatClient(ctx).json("/users/reactivate", {
      method: "POST",
      body: { email: input.email },
    });
  },
};

export default reactivateUser;
