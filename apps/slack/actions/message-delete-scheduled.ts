import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  scheduledMessageId: string;
}

const messageDeleteScheduled: ActionDefinition<Input> = {
  key: "message-delete-scheduled",
  type: "perform",
  resource: "message",
  title: "Delete Scheduled Message",
  description: "Cancels a scheduled message (chat.deleteScheduledMessage).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "scheduledMessageId", label: "Scheduled message ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/chat.deleteScheduledMessage", {
      method: "POST",
      body: { channel: input.channel, scheduled_message_id: input.scheduledMessageId },
    });
  },
};

export default messageDeleteScheduled;
