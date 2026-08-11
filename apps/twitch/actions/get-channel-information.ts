import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/channels` — Get Channel Information.
 *
 * What a channel is *about*: its title, category, language, tags and content
 * classification labels. This is the endpoint to use for "what is this streamer
 * playing", including while they are offline — Get Streams returns nothing at
 * all for an offline broadcaster, which is the most common way this pair gets
 * confused.
 *
 * `broadcaster_id` is required and repeatable, up to 100 ids. Twitch silently
 * ignores duplicates and ids it cannot find, so a short response is a lookup
 * miss rather than an error.
 *
 * `delay` is only ever non-zero when the request carries a user access token
 * belonging to that same partner broadcaster; with an app token it always reads
 * 0, which is not the same as "no delay configured".
 */
interface Input {
  broadcasterId: string[] | string;
}

const getChannelInformation: ActionDefinition<Input> = {
  key: "get-channel-information",
  type: "read",
  title: "Get Channel Information",
  description:
    "Get one or more channels' title, category, language, tags and content classification " +
    "labels. Works whether or not the broadcaster is live.",
  resource: "channel",
  params: [
    {
      key: "broadcasterId",
      label: "Broadcaster IDs",
      type: "string",
      required: true,
      placeholder: "141981764",
      hint: "One or more numeric broadcaster user IDs, comma-separated, up to 100. Use Get Users " +
        "to turn a login name into an ID.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Channels" },
    { key: "data[].broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].broadcaster_login", type: "string", label: "Broadcaster login" },
    { key: "data[].broadcaster_name", type: "string", label: "Broadcaster display name" },
    { key: "data[].game_id", type: "string", label: "Category ID" },
    { key: "data[].game_name", type: "string", label: "Category name" },
    { key: "data[].title", type: "string", label: "Stream title" },
    { key: "data[].broadcaster_language", type: "string", label: "Language (ISO 639-1)" },
    { key: "data[].tags", type: "array", label: "Channel tags" },
    { key: "data[].content_classification_labels", type: "array", label: "CCLs" },
    { key: "data[].is_branded_content", type: "boolean", label: "Branded content" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel information");
    return await new TwitchClient(ctx).get("/channels", {
      broadcaster_id: toList(input.broadcasterId),
    });
  },
};

export default getChannelInformation;
