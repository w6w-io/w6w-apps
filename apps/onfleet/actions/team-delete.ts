import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `DELETE /teams/:id` — delete a team. Workers are unassigned, not deleted. */
const action: ActionDefinition = {
  key: "team-delete",
  type: "perform",
  resource: "team",
  title: "Delete team",
  description: "Delete a team. Its workers are not deleted, only removed from the team.",
  idempotent: true,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const { teamId } = input as { teamId: string };
    if (!teamId) throw new Error("`teamId` is required");
    await new OnfleetClient(ctx).request(`/teams/${encodeURIComponent(teamId)}`, {
      method: "DELETE",
    });
    ctx.log("info", "deleted an Onfleet team", { teamId });
    return { deleted: true };
  },
};

export default action;
