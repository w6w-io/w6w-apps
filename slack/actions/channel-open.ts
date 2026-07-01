import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId?: string;
  users?: string;
  returnIm?: boolean;
}

const channelOpen: ActionDefinition<Input> = {
  key: "channel-open",
  type: "perform",
  resource: "channel",
  title: "Open Channel",
  description: "Opens/resumes an IM or MPIM (conversations.open).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string" },
    {
      key: "users",
      label: "Users",
      type: "string",
      hint: "Comma-separated user IDs to open a DM/MPIM with.",
    },
    { key: "returnIm", label: "Return IM", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.channelId) body.channel = input.channelId;
    if (input.users) body.users = input.users;
    if (input.returnIm !== undefined) body.return_im = input.returnIm;
    const res = await client.request<{ channel?: unknown }>("/conversations.open", {
      method: "POST",
      body,
    });
    return res.channel ?? res;
  },
};

export default channelOpen;
