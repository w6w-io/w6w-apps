import type { ActionDefinition } from "@w6w/types";
import { compact, MattermostClient } from "../lib/client.ts";

/**
 * `POST /api/v4/channels/{channel_id}/members` — add a user to a channel.
 *
 * The user must already be a member of the channel's **team**; this endpoint
 * does not add them to it, and attempting to add a non-member returns a
 * permission error rather than joining them implicitly.
 *
 * Idempotent: adding someone already in the channel returns their existing
 * membership rather than failing or duplicating it.
 */
interface Input {
  channelId: string;
  userId: string;
  postRootId?: string;
}

const channelMemberAdd: ActionDefinition<Input> = {
  key: "channel-member-add",
  type: "perform",
  resource: "channel",
  title: "Add Channel Member",
  description: "Add a user to a channel. They must already be on the channel's team.",
  idempotent: true,
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    {
      key: "postRootId",
      label: "From post (root ID)",
      type: "string",
      hint:
        "The post whose 'add to channel' link prompted this, if any. Mattermost uses it to thread " +
        "the join notice.",
    },
  ],
  output: [
    { key: "channel_id", type: "string", label: "Channel id" },
    { key: "user_id", type: "string", label: "User id" },
    { key: "roles", type: "string", label: "The member's roles in the channel" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/channels/${encodeURIComponent(input.channelId)}/members`,
      {
        method: "POST",
        body: compact({ user_id: input.userId, post_root_id: input.postRootId }),
      },
    );
  },
};

export default channelMemberAdd;
