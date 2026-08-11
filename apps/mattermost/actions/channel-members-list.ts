import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `GET /api/v4/channels/{channel_id}/members` — who is in a channel.
 *
 * Returns **membership records**, not user objects: each entry carries
 * `user_id`, `roles`, `notify_props` and the read-state timestamps, but no
 * username or email. Resolving names needs a second call per user, which is why
 * the output labels say so — a workflow that expects `username` here gets
 * `undefined` and no error.
 */
interface Input {
  channelId: string;
  page?: number;
  perPage?: number;
}

const channelMembersList: ActionDefinition<Input> = {
  key: "channel-members-list",
  type: "search",
  resource: "channel",
  title: "List Channel Members",
  description:
    "List a channel's memberships. Returns membership records — user ids and roles, not " +
    "usernames.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 0 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 200 },
      hint: "Default 60, maximum 200.",
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Membership records — `user_id` and `roles`, no username" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/channels/${encodeURIComponent(input.channelId)}/members`,
      { query: { page: input.page, per_page: input.perPage } },
    );
  },
};

export default channelMembersList;
