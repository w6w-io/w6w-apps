import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  timestamp: string;
  name: string;
}

const reactionRemove: ActionDefinition<Input> = {
  key: "reaction-remove",
  type: "perform",
  resource: "reaction",
  title: "Remove Reaction",
  description: "Removes an emoji reaction from a message (reactions.remove).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "timestamp", label: "Message ts", type: "string", required: true },
    { key: "name", label: "Emoji name", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/reactions.remove", {
      method: "POST",
      body: { channel: input.channel, timestamp: input.timestamp, name: input.name },
    });
  },
};

export default reactionRemove;
