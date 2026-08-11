import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
}

/**
 * `GET /v1/teams/:id` — one Team and its members.
 *
 * The embedded User rows here are **thinner** than the ones List Teams returns:
 * `availability_status` and `default_number_id` are documented as coming from
 * the list endpoint, and the User `available` boolean is absent from the Team
 * payload entirely ("User attribute `available` is not available in Teams
 * endpoint"). If you need a member's availability, ask List User Availability.
 */
const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Retrieve Team",
  description:
    "Fetch one Team with its members. Member rows here omit availability — List Teams carries " +
    "more per user than this does.",
  params: [teamIdParam],
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Team name — unique, 64 characters maximum" },
    { key: "created_at", type: "string", label: "ISO 8601 timestamp" },
    { key: "users", type: "array", label: "Members" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/teams/${encodeId(input.teamId)}`, "team");
  },
};

export default teamGet;
