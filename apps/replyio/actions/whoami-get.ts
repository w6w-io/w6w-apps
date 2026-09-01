import type { ActionDefinition } from "@w6w/types";
import { ReplyClient, WHOAMI_PATH } from "../lib/client.ts";

/**
 * `GET /v3/whoami` — which user this connection's API key acts as.
 *
 * Requires no scope — any valid key can call it — and its response carries
 * only account identifiers, never the key itself. See `auth/api-key.ts` for
 * why this is also the connection's health probe.
 */
interface Output {
  userId: number;
  username: string;
  teamId: number;
}

const whoamiGet: ActionDefinition<Record<string, never>, Output> = {
  key: "whoami-get",
  type: "read",
  resource: "account",
  title: "Get Current User",
  description: "See which user the connected API key acts as — its user id, username, and team id.",
  params: [],
  output: [
    { key: "userId", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "teamId", type: "number", label: "Team ID" },
  ],

  execute(_input, ctx) {
    return new ReplyClient(ctx).json<Output>(WHOAMI_PATH);
  },
};

export default whoamiGet;
