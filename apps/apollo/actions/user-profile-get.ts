import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `GET /users/api_profile` — the identity of the user who owns this API key.
 *
 * This is also the connection's credential probe (`auth/api-key.ts`) — see that file for
 * why. `include_credit_usage` is exposed here (unlike in the probe/`afterConnect`) since
 * a workflow calling this action directly may want it; the health `quota` check reads
 * team-wide balances separately via `credit-usage-stats-get` instead.
 */
interface Input {
  include_credit_usage?: boolean;
}

const userProfileGet: ActionDefinition<Input> = {
  key: "user-profile-get",
  type: "read",
  resource: "user",
  title: "Get Current User Profile",
  description: "Fetch the identity of the user who owns this connection's API key.",
  params: [
    {
      key: "include_credit_usage",
      label: "Include credit usage",
      type: "boolean",
      hint: "Also returns this user's and the team's credit balances.",
    },
  ],
  output: [{ key: "profile", type: "object", label: "id, team_id, name, title, email" }],

  async execute(input, ctx) {
    const profile = await new ApolloClient(ctx).get(
      "/users/api_profile",
      input.include_credit_usage ? { include_credit_usage: true } : undefined,
    );
    return { profile };
  },
};

export default userProfileGet;
