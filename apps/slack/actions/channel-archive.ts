import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
}

const channelArchive: ActionDefinition<Input> = {
  key: "channel-archive",
  type: "perform",
  resource: "channel",
  title: "Archive Channel",
  description: "Archives a Slack channel (conversations.archive).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.archive", {
      method: "POST",
      body: { channel: input.channelId },
    });
  },
};

export default channelArchive;
