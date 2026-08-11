import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  userId: string;
}

/**
 * `DELETE /v1/teams/:team_id/users/:user_id` — remove one User from one Team.
 * Answers **200** with the updated Team.
 *
 * Removing a member deletes nothing else: "Calls made and received by this User
 * won't be deleted", and the User itself is untouched — this only unwires them
 * from that Team's call distribution.
 */
const teamUserRemove: ActionDefinition<Input> = {
  key: "team-user-remove",
  type: "perform",
  resource: "team",
  title: "Remove User from Team",
  description:
    "Remove one User from one Team. The User and their Calls are untouched — only the Team's call " +
    "distribution changes.",
  // Membership is a set, so replaying reaches the same state.
  idempotent: true,
  params: [
    teamIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "456",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "users", type: "array", label: "Members after the change" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(
      `/teams/${encodeId(input.teamId)}/users/${encodeId(input.userId)}`,
      "team",
      { method: "DELETE" },
    );
  },
};

export default teamUserRemove;
