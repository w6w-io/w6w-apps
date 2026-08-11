import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/chat/badges/global` — Get Global Chat Badges.
 *
 * The badges Twitch defines for every chat room (Broadcaster, Moderator, VIP,
 * Turbo, Prime and so on). No parameters — the reference's query-parameter
 * section reads "None".
 *
 * The shape is two levels deep and easy to flatten by mistake: `data` is a list
 * of **badge sets**, each with a `set_id` and a `versions` array. The image URLs
 * live on the versions, not on the set.
 */
type Input = Record<string, never>;

const getGlobalChatBadges: ActionDefinition<Input> = {
  key: "get-global-chat-badges",
  type: "read",
  title: "Get Global Chat Badges",
  description:
    "List the chat badges Twitch defines for every channel. Takes no parameters. Each item is a " +
    "badge SET; the images live on its `versions` array.",
  resource: "chat",
  params: [],
  output: [
    { key: "data", type: "array", label: "Badge sets" },
    { key: "data[].set_id", type: "string", label: "Badge set ID" },
    { key: "data[].versions", type: "array", label: "Versions of this badge" },
    { key: "data[].versions[].id", type: "string", label: "Version ID" },
    { key: "data[].versions[].title", type: "string", label: "Badge title" },
    { key: "data[].versions[].image_url_4x", type: "string", label: "72px image URL" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "twitch: get global chat badges");
    return await new TwitchClient(ctx).get("/chat/badges/global");
  },
};

export default getGlobalChatBadges;
