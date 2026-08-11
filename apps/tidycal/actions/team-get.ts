import type { ActionDefinition } from "@w6w/types";
import { encodeId, TidyCalClient } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

/**
 * `GET /api/teams/{team}` — one team.
 *
 * Another of the four reads that answer the **bare entity** rather than
 * `{"data": …}`. TidyCal documents `403` for a team you cannot see and `404` for
 * one that does not exist, which are worth keeping apart: the first means the
 * connection's account was removed from the team, the second that the team was
 * deleted.
 */
interface Input {
  team: number;
}

const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get team",
  description: "Fetch one team by ID.",
  params: [teamIdParam],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json(`/teams/${encodeId(input.team)}`);
  },
};

export default teamGet;
