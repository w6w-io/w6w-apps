import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam } from "../lib/params.ts";

/**
 * `GET /helix/chat/badges` — Get Channel Chat Badges.
 *
 * A broadcaster's own subscriber and Bits badges. The list is empty if they
 * have not made any, which is the common case for a small channel and is not an
 * error.
 *
 * Same two-level shape as the global badges: `data` is a list of badge sets,
 * each carrying a `versions` array that holds the images.
 */
interface Input {
  broadcasterId: string;
}

const getChannelChatBadges: ActionDefinition<Input> = {
  key: "get-channel-chat-badges",
  type: "read",
  title: "Get Channel Chat Badges",
  description:
    "List a broadcaster's custom chat badges — subscriber and Bits badges. Empty if they have " +
    "not created any.",
  resource: "chat",
  params: [broadcasterIdParam()],
  output: [
    { key: "data", type: "array", label: "Badge sets" },
    { key: "data[].set_id", type: "string", label: "Badge set ID" },
    { key: "data[].versions", type: "array", label: "Versions of this badge" },
    { key: "data[].versions[].id", type: "string", label: "Version ID" },
    { key: "data[].versions[].title", type: "string", label: "Badge title" },
    { key: "data[].versions[].image_url_4x", type: "string", label: "72px image URL" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel chat badges");
    return await new TwitchClient(ctx).get("/chat/badges", {
      broadcaster_id: input.broadcasterId,
    });
  },
};

export default getChannelChatBadges;
