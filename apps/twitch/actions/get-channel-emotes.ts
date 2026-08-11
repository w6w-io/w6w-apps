import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam } from "../lib/params.ts";

/**
 * `GET /helix/chat/emotes` — Get Channel Emotes.
 *
 * A broadcaster's own custom emotes: subscriber emotes, Bits-tier emotes and
 * follower emotes. An empty `data` means the broadcaster has created none, not
 * that the lookup failed.
 *
 * `emote_type` distinguishes them (`subscriptions`, `bitstier`, `follower`), and
 * `tier` is populated **only** when `emote_type` is `subscriptions` — it is an
 * empty string otherwise, not null.
 *
 * As with global emotes, build image URLs from the response's `template` rather
 * than the `images` object.
 */
interface Input {
  broadcasterId: string;
}

const getChannelEmotes: ActionDefinition<Input> = {
  key: "get-channel-emotes",
  type: "read",
  title: "Get Channel Emotes",
  description:
    "List a broadcaster's custom emotes — subscriber, Bits-tier and follower emotes. An empty " +
    "list means they have created none.",
  resource: "chat",
  params: [broadcasterIdParam()],
  output: [
    { key: "data", type: "array", label: "Channel emotes" },
    { key: "data[].id", type: "string", label: "Emote ID" },
    { key: "data[].name", type: "string", label: "Emote name, as typed in chat" },
    { key: "data[].emote_type", type: "string", label: "subscriptions | bitstier | follower" },
    {
      key: "data[].tier",
      type: "string",
      label: "Sub tier, empty unless emote_type is subscriptions",
    },
    { key: "data[].emote_set_id", type: "string", label: "Emote set ID" },
    { key: "template", type: "string", label: "CDN URL template" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel emotes");
    return await new TwitchClient(ctx).get("/chat/emotes", {
      broadcaster_id: input.broadcasterId,
    });
  },
};

export default getChannelEmotes;
