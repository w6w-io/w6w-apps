import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  ts: string;
}

const messageGetPermalink: ActionDefinition<Input> = {
  key: "message-get-permalink",
  type: "read",
  resource: "message",
  title: "Get Message Permalink",
  description: "Returns a permalink URL for a specific message (chat.getPermalink).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "ts", label: "Message ts", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/chat.getPermalink", {
      query: { channel: input.channel, message_ts: input.ts },
    });
  },
};

export default messageGetPermalink;
