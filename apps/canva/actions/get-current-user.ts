import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

/**
 * `GET /v1/users/me` — requires a valid token and NO specific scope. This
 * is also the auth `test` probe (see `auth/oauth2.ts`); the action exists
 * separately so a workflow can read the user/team ID mid-run.
 */
const getCurrentUser: ActionDefinition<Record<string, never>> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the connected user's User ID and Team ID.",
  params: [],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "team_id", type: "string", label: "Team ID" },
  ],

  async execute(_input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ team_user: Record<string, unknown> }>("/rest/v1/users/me");
    return res.team_user;
  },
};

export default getCurrentUser;
