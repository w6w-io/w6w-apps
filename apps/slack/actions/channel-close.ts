import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelClose: ActionDefinition<Input> = {
  key: "channel-close",
  type: "perform",
  resource: "channel",
  title: "Close Channel",
  description: "Closes a direct message or multi-person direct message (conversations.close).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.close", {
      method: "POST",
      body: { channel: input.channelId },
    });
  },
};

export default channelClose;
