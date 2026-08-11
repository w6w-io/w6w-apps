import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/chat/emotes/global` — Get Global Emotes.
 *
 * Twitch's own emotes, usable in any chat room. No parameters at all — the
 * reference's "Request Query Parameters" section reads "None".
 *
 * The response's `template` field is the part worth using: it is a URL with
 * `{{id}}`, `{{format}}`, `{{theme_mode}}` and `{{scale}}` placeholders, and
 * Twitch's own note says to build image URLs from it rather than from the
 * `images` object, which always serves the static light-background variant
 * whatever the emote actually supports.
 */
type Input = Record<string, never>;

const getGlobalEmotes: ActionDefinition<Input> = {
  key: "get-global-emotes",
  type: "read",
  title: "Get Global Emotes",
  description:
    "List the emotes Twitch makes available in every chat room. Takes no parameters. Build image " +
    "URLs from the response's `template` field rather than from `images`, which only ever " +
    "returns the static light-background variant.",
  resource: "chat",
  params: [],
  output: [
    { key: "data", type: "array", label: "Global emotes" },
    { key: "data[].id", type: "string", label: "Emote ID" },
    { key: "data[].name", type: "string", label: "Emote name, as typed in chat" },
    { key: "data[].format", type: "array", label: "static and/or animated" },
    { key: "data[].scale", type: "array", label: "Available sizes" },
    { key: "data[].theme_mode", type: "array", label: "dark and/or light" },
    { key: "template", type: "string", label: "CDN URL template" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "twitch: get global emotes");
    return await new TwitchClient(ctx).get("/chat/emotes/global");
  },
};

export default getGlobalEmotes;
