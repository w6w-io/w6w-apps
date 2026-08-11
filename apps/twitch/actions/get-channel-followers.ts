import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { afterParam, broadcasterIdParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/channels/followers` — Get Channel Followers.
 *
 * **Requires a user access token with the `moderator:read:followers` scope**,
 * and the token's user must be either the broadcaster or one of their
 * moderators.
 *
 * The trap here is that it does not fail when those conditions are unmet. The
 * reference is explicit: "If a scope is not provided or the user isn't the
 * broadcaster or a moderator for the specified channel, only the total follower
 * count will be included in the response." So a caller with the wrong token
 * gets `200 OK` with `total` populated and `data: []` — which reads exactly
 * like a channel that nobody follows. That is why this action's output
 * documents `total` as the field that is always present and `data` as the one
 * that is conditional, and why the description says so rather than leaving the
 * empty list to be misread.
 *
 * `user_id` narrows the answer to "does this one person follow the channel",
 * and needs the same permissions.
 */
interface Input {
  broadcasterId: string;
  userId?: string;
  first?: number;
  after?: string;
}

const getChannelFollowers: ActionDefinition<Input> = {
  key: "get-channel-followers",
  type: "read",
  title: "Get Channel Followers",
  description:
    "List the users following a broadcaster, or check whether one specific user follows them. " +
    "Requires a user access token with the moderator:read:followers scope belonging to the " +
    "broadcaster or one of their moderators — without that, Twitch still answers 200 but returns " +
    "only the total count and an empty list.",
  resource: "channel",
  params: [
    broadcasterIdParam(
      "The channel whose followers you want. The token's user must be this broadcaster or one of " +
        "their moderators.",
    ),
    {
      key: "userId",
      label: "User ID (follow check)",
      type: "string",
      hint: "Set to check whether this one user follows the broadcaster. The response contains " +
        "them if they do, and is empty if they do not.",
    },
    firstParam(100, 20),
    afterParam,
  ],
  output: [
    { key: "total", type: "number", label: "Total followers (always present)" },
    { key: "data", type: "array", label: "Followers (empty without the scope)" },
    { key: "data[].user_id", type: "string", label: "Follower user ID" },
    { key: "data[].user_login", type: "string", label: "Follower login" },
    { key: "data[].user_name", type: "string", label: "Follower display name" },
    { key: "data[].followed_at", type: "string", label: "Followed at (RFC3339)" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get channel followers");
    return await new TwitchClient(ctx).get("/channels/followers", {
      broadcaster_id: input.broadcasterId,
      user_id: input.userId,
      first: input.first,
      after: input.after,
    });
  },
};

export default getChannelFollowers;
