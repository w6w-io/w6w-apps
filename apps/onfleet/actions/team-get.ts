import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /teams/:id` — fetch a single team. */
const action: ActionDefinition = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get team",
  description: "Fetch a team by ID.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workers", type: "array", label: "Workers" },
  ],

  async execute(input, ctx) {
    const { teamId } = input as { teamId: string };
    if (!teamId) throw new Error("`teamId` is required");
    return await new OnfleetClient(ctx).request(`/teams/${encodeURIComponent(teamId)}`);
  },
};

export default action;
