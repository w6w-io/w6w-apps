import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";

/**
 * `GET /users/me/teams` — every team this connection's user belongs to.
 *
 * Wrapped as `{"results": [...]}`, one of four different list envelopes this
 * API uses (see `lib/client.ts`). Team keys from here feed `teamKeyParam`
 * elsewhere (contact/organization actions).
 */
type Input = Record<string, never>;

interface TeamsResponse {
  results?: unknown[];
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List My Teams",
  description: "List every team this connection's user belongs to.",
  params: [],
  output: [{ key: "results", type: "array", label: "Teams" }],

  async execute(_input, ctx) {
    const body = await new StreakClient(ctx).get<TeamsResponse>("/users/me/teams");
    return { results: body?.results ?? [] };
  },
};

export default teamList;
