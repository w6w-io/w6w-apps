import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/bits/cheermotes` — Get Cheermotes.
 *
 * The animated emotes viewers attach Bits to. `broadcaster_id` is **optional**
 * here, unlike almost every other channel-scoped read in this app: without it
 * the response carries only Twitch's global Cheermotes, and with it the
 * broadcaster's own uploads are added, marked `type: "channel_custom"`.
 *
 * A Cheermote is used in chat as `{prefix}{bits}` — `Cheer100` for the prefix
 * `Cheer`. The tiers are ranges: a tier's ceiling is the next tier's `min_bits`
 * minus one, and the last tier has no ceiling beyond the maximum cheer.
 */
interface Input {
  broadcasterId?: string;
}

const getCheermotes: ActionDefinition<Input> = {
  key: "get-cheermotes",
  type: "read",
  title: "Get Cheermotes",
  description:
    "List the Cheermotes viewers can use to cheer Bits. With no broadcaster ID this returns only " +
    "the global set; with one, that broadcaster's custom Cheermotes are included too.",
  resource: "bits",
  params: [
    {
      key: "broadcasterId",
      label: "Broadcaster ID",
      type: "string",
      placeholder: "141981764",
      hint: "Optional. Add it to include the broadcaster's own uploaded Cheermotes, which come " +
        'back with type "channel_custom". Not every broadcaster has any.',
    },
  ],
  output: [
    { key: "data", type: "array", label: "Cheermotes" },
    { key: "data[].prefix", type: "string", label: "Chat prefix, e.g. Cheer" },
    { key: "data[].type", type: "string", label: "global_first_party | channel_custom | …" },
    { key: "data[].tiers", type: "array", label: "Bits tiers" },
    { key: "data[].tiers[].min_bits", type: "number", label: "Minimum Bits for this tier" },
    { key: "data[].tiers[].id", type: "string", label: "Tier level" },
    { key: "data[].tiers[].color", type: "string", label: "Tier colour (hex)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get cheermotes");
    return await new TwitchClient(ctx).get("/bits/cheermotes", {
      broadcaster_id: input.broadcasterId,
    });
  },
};

export default getCheermotes;
