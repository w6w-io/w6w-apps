import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  ts: string;
}

const messageDelete: ActionDefinition<Input> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Deletes a message (chat.delete).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "ts", label: "Message ts", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/chat.delete", {
      method: "POST",
      body: { channel: input.channel, ts: input.ts },
    });
  },
};

export default messageDelete;
