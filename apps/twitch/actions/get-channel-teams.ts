import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam } from "../lib/params.ts";

/**
 * `GET /helix/teams/channel` — Get Channel Teams.
 *
 * The teams a broadcaster belongs to. Returns an empty array for a broadcaster
 * who is on no team, which is most of them.
 *
 * Note this is the inverse of Get Teams: that one takes a team and lists its
 * members, this one takes a broadcaster and lists their teams. The rows here
 * describe the *team*, with the broadcaster repeated on each.
 */
interface Input {
  broadcasterId: string;
}

const getChannelTeams: ActionDefinition<Input> = {
  key: "get-channel-teams",
  type: "read",
  title: "Get Channel Teams",
  description:
    "List the Twitch teams a broadcaster is a member of. Empty for a broadcaster on no team.",
  resource: "team",
  params: [broadcasterIdParam()],
  output: [
    { key: "data", type: "array", label: "Teams the broadcaster belongs to" },
    { key: "data[].id", type: "string", label: "Team ID" },
    { key: "data[].team_name", type: "string", label: "Team name" },
    { key: "data[].team_display_name", type: "string", label: "Team display name" },
    { key: "data[].broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].broadcaster_login", type: "string", label: "Broadcaster login" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel teams");
    return await new TwitchClient(ctx).get("/teams/channel", {
      broadcaster_id: input.broadcasterId,
    });
  },
};

export default getChannelTeams;
