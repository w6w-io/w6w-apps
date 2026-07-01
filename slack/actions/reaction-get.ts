import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  timestamp: string;
}

const reactionGet: ActionDefinition<Input> = {
  key: "reaction-get",
  type: "read",
  resource: "reaction",
  title: "Get Reactions",
  description: "Fetches reactions on a specific message (reactions.get).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "timestamp", label: "Message ts", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/reactions.get", {
      query: { channel: input.channel, timestamp: input.timestamp },
    });
  },
};

export default reactionGet;
