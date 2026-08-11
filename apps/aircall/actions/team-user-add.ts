import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  userId: string;
}

/**
 * `POST /v1/teams/:team_id/users/:user_id` — add one User to one Team. Answers
 * **201** with the updated Team.
 *
 * The membership is expressed entirely in the path; there is no request body,
 * and Users go in one at a time — "Users can be added one by one to a Team."
 *
 * A 422 here is Aircall's catch-all for a rejected membership change, and its
 * reason arrives in the `troubleshoot` field of the error body rather than in
 * the status code.
 */
const teamUserAdd: ActionDefinition<Input> = {
  key: "team-user-add",
  type: "perform",
  resource: "team",
  title: "Add User to Team",
  description: "Add one User to one Team. Returns the updated Team with its members.",
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
      hint: "Numeric User ID. This endpoint takes the id in the path, not an email address.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
    { key: "users", type: "array", label: "Members after the change" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(
      `/teams/${encodeId(input.teamId)}/users/${encodeId(input.userId)}`,
      "team",
      { method: "POST" },
    );
  },
};

export default teamUserAdd;
