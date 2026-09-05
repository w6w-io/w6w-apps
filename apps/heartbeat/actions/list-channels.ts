import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/channels` — every channel in the community (posts, chat and voice). */
const listChannels: ActionDefinition<Record<string, never>> = {
  key: "list-channels",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "Return every channel in the community — POSTS (thread), CHAT and VOICE channels.",
  params: [],
  output: [{ key: "channels", type: "array", label: "Channels — [{id, name, emoji, type}]" }],

  async execute(_input, ctx) {
    const channels = await new HeartbeatClient(ctx).json("/channels");
    return { channels };
  },
};

export default listChannels;
