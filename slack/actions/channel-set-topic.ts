import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  topic: string;
}

const channelSetTopic: ActionDefinition<Input> = {
  key: "channel-set-topic",
  type: "perform",
  resource: "channel",
  title: "Set Channel Topic",
  description: "Sets the topic of a channel (conversations.setTopic).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "topic", label: "Topic", type: "text", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.setTopic", {
      method: "POST",
      body: { channel: input.channelId, topic: input.topic },
    });
    return res.channel ?? res;
  },
};

export default channelSetTopic;
