import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

/**
 * `GET /v2/teams/{team_id}` — one team.
 *
 * Returns `{"team": {...Team}}`, the same schema `team-list` returns.
 */
interface Input {
  team_id: number;
}

const action: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Get one team by ID (GET /v2/teams/{team_id}).",
  params: [teamIdParam],
  output: [{ key: "team", type: "object", label: "Team" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/teams/${input.team_id}`);
  },
};

export default action;
