import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  guildId: string;
  /** Optional client-side filter: keep only channels whose `type` matches one of these. */
  filterTypes?: number[];
  limit?: number;
}

/**
 * List channels in a guild. Discord returns the full flat list from a single
 * request (there is no page cursor); we apply filter/limit client-side.
 *
 * https://discord.com/developers/docs/resources/guild#get-guild-channels
 */
const listChannels: ActionDefinition<Input> = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List channels in a Discord server.",
  params: [
    { key: "guildId", label: "Server (Guild) ID", type: "string", required: true },
    {
      key: "filterTypes",
      label: "Filter by Type",
      type: "multiselect",
      options: [
        { value: 0, label: "Guild Text" },
        { value: 2, label: "Guild Voice" },
        { value: 4, label: "Guild Category" },
      ],
    },
    { key: "limit", label: "Limit", type: "number" },
  ],
  output: [
    { key: "channels", type: "array", label: "Channels" },
  ],

  async execute(input, ctx) {
    const client = new DiscordClient(ctx);
    let channels = await client.request<Array<Record<string, unknown>>>(
      `/guilds/${input.guildId}/channels`,
    );
    if (input.filterTypes && input.filterTypes.length > 0) {
      const allowed = new Set(input.filterTypes);
      channels = channels.filter((c) => allowed.has(c.type as number));
    }
    if (input.limit !== undefined && input.limit > 0) {
      channels = channels.slice(0, input.limit);
    }
    return { channels };
  },
};

export default listChannels;
