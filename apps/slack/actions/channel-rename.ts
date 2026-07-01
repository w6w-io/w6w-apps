import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  name: string;
}

const channelRename: ActionDefinition<Input> = {
  key: "channel-rename",
  type: "perform",
  resource: "channel",
  title: "Rename Channel",
  description: "Renames a channel (conversations.rename).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "name", label: "New name", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.rename", {
      method: "POST",
      body: { channel: input.channelId, name: input.name },
    });
    return res.channel ?? res;
  },
};

export default channelRename;
