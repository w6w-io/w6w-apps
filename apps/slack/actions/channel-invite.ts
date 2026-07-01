import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  userIds: string;
}

const channelInvite: ActionDefinition<Input> = {
  key: "channel-invite",
  type: "perform",
  resource: "channel",
  title: "Invite to Channel",
  description: "Invites one or more users to a channel (conversations.invite).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated list of user IDs.",
    },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ channel?: unknown }>("/conversations.invite", {
      method: "POST",
      body: { channel: input.channelId, users: input.userIds },
    });
    return res.channel ?? res;
  },
};

export default channelInvite;
