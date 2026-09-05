import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/channelCategories` — every channel category (channel group) in the community. */
const listChannelCategories: ActionDefinition<Record<string, never>> = {
  key: "list-channel-categories",
  type: "read",
  resource: "channel-category",
  title: "List Channel Categories",
  description: "Return every channel category in the community.",
  params: [],
  output: [{ key: "channelCategories", type: "array", label: "Channel categories — [{id, name}]" }],

  async execute(_input, ctx) {
    const channelCategories = await new HeartbeatClient(ctx).json("/channelCategories");
    return { channelCategories };
  },
};

export default listChannelCategories;
