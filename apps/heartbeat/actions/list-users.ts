import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `GET /v0/users` — every member in the community, in one uncapped response.
 *
 * Heartbeat documents no pagination on this endpoint at all — no `limit`, no
 * cursor. A large community returns its entire member list, profiles
 * included, in one call.
 */
const listUsers: ActionDefinition<Record<string, never>> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "Return every member of the Heartbeat community. Heartbeat paginates nothing here — this " +
    "is the full member list in one response.",
  params: [],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(_input, ctx) {
    const users = await new HeartbeatClient(ctx).json("/users");
    return { users };
  },
};

export default listUsers;
