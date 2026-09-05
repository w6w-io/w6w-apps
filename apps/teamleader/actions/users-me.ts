import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `POST /users.me` — verified against
 * `developer.focus.teamleader.eu/docs/api/users-me` on 2026-09-01. Same
 * endpoint the OAuth auth method probes for credential liveness — exposed
 * here as an Action too because "who is this Connection authenticated as"
 * is a genuinely common workflow need, and the response carries no
 * credential material (just profile fields: name, email, language, time
 * zone, team memberships).
 */
type Input = Record<string, never>;

const usersMe: ActionDefinition<Input> = {
  key: "users-me",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the user this connection is authenticated as.",
  params: [],
  output: [{ key: "user", type: "object", label: "Current user" }],

  async execute(_input, ctx) {
    const user = await call(ctx, "users.me");
    return { user };
  },
};

export default usersMe;
