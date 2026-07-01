import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  timestamp: string;
  name: string;
}

const reactionAdd: ActionDefinition<Input> = {
  key: "reaction-add",
  type: "perform",
  resource: "reaction",
  title: "Add Reaction",
  description: "Adds an emoji reaction to a message (reactions.add).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "timestamp", label: "Message ts", type: "string", required: true },
    {
      key: "name",
      label: "Emoji name",
      type: "string",
      required: true,
      hint: "Without the surrounding colons, e.g. `thumbsup`.",
    },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/reactions.add", {
      method: "POST",
      body: { channel: input.channel, timestamp: input.timestamp, name: input.name },
    });
  },
};

export default reactionAdd;
