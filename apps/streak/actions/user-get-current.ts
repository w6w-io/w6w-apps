import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";

/**
 * `GET /users/me` — the user object behind this connection's API key.
 *
 * Since API keys are never scoped, this is also the account's own identity:
 * "each API key only has privileges to access its own user object." Safe to
 * invoke with no params, which is why it also serves as the derived
 * `auth:api-key` health probe (`auth/api-key.ts`).
 */
type Input = Record<string, never>;

const userGetCurrent: ActionDefinition<Input> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the Streak user object for this connection's own API key.",
  params: [],
  output: [{ key: "data", type: "object", label: "The current user" }],

  execute(_input, ctx) {
    return new StreakClient(ctx).get("/users/me");
  },
};

export default userGetCurrent;
