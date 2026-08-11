import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `GET /api/v4/teams/name/{team_name}/channels/name/{channel_name}` — resolve a
 * human-readable team and channel name to a channel object.
 *
 * This is the action that makes the rest of the app usable. Everything else
 * needs a `channel_id`, and nobody knows one — what a person has is the URL,
 * `https://mattermost.example.com/acme/channels/town-square`, whose two path
 * segments are exactly this endpoint's two parameters.
 *
 * Both names are the **URL handles**, not the display names: `town-square`, not
 * "Town Square". Mattermost lowercases and hyphenates handles, and looking up a
 * display name returns a 404 that reads like the channel does not exist.
 *
 * The sibling endpoint that takes a team *id* instead of a team name is not
 * shipped: if you already have the team id you are past the point where this
 * lookup helps.
 */
interface Input {
  teamName: string;
  channelName: string;
  includeDeleted?: boolean;
}

const channelGetByName: ActionDefinition<Input> = {
  key: "channel-get-by-name",
  type: "read",
  resource: "channel",
  title: "Get Channel by Name",
  description:
    "Resolve a team and channel name — the two segments of a Mattermost URL — to a channel, and " +
    "so to the channel id every other action needs.",
  params: [
    {
      key: "teamName",
      label: "Team name",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The team's URL handle, from the first path segment of a channel URL.",
    },
    {
      key: "channelName",
      label: "Channel name",
      type: "string",
      required: true,
      placeholder: "town-square",
      hint: 'The channel\'s URL handle — `town-square`, not the display name "Town Square".',
    },
    {
      key: "includeDeleted",
      label: "Include archived",
      type: "boolean",
      hint: "Also match archived channels.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Channel id — what the other actions need" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "type", type: "string", label: "`O` public, `P` private, `D` direct, `G` group" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/teams/name/${encodeURIComponent(input.teamName)}/channels/name/${
        encodeURIComponent(input.channelName)
      }`,
      { query: { include_deleted: input.includeDeleted } },
    );
  },
};

export default channelGetByName;
