import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/teams` — Get Teams.
 *
 * A Twitch team and its member list. The reference marks both `name` and `id`
 * "Required?: Yes" while also saying "This parameter and the id parameter are
 * mutually exclusive; you must specify the team's name or ID but not both" —
 * so exactly one is required, and this action enforces that rather than sending
 * a request Twitch will refuse.
 *
 * `data` is a list containing the single team asked for, with its members under
 * `data[0].users`.
 */
interface Input {
  name?: string;
  id?: string;
}

const getTeams: ActionDefinition<Input> = {
  key: "get-teams",
  type: "read",
  title: "Get Teams",
  description:
    "Get one Twitch team and its member list, by team name or team ID. Exactly one of the two, " +
    "never both.",
  resource: "team",
  params: [
    {
      key: "name",
      label: "Team name",
      type: "string",
      placeholder: "livecoders",
      hint: "The team's URL slug. Mutually exclusive with the team ID.",
    },
    {
      key: "id",
      label: "Team ID",
      type: "string",
      hint: "Mutually exclusive with the team name.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "The team (one item)" },
    { key: "data[].id", type: "string", label: "Team ID" },
    { key: "data[].team_name", type: "string", label: "Team name" },
    { key: "data[].team_display_name", type: "string", label: "Team display name" },
    { key: "data[].info", type: "string", label: "Team description (may contain HTML)" },
    { key: "data[].users", type: "array", label: "Team members" },
    { key: "data[].created_at", type: "string", label: "Created at (RFC3339)" },
  ],

  async execute(input, ctx) {
    const name = input.name?.trim();
    const id = input.id?.trim();
    if (!name && !id) throw new Error("Get Teams needs either a team name or a team ID");
    if (name && id) {
      throw new Error(
        "Get Teams accepts a team name or a team ID, not both — Twitch documents them as " +
          "mutually exclusive",
      );
    }
    ctx.log("info", "twitch: get teams");
    return await new TwitchClient(ctx).get("/teams", { name, id });
  },
};

export default getTeams;
