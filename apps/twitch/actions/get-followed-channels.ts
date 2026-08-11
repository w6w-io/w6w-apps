import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { afterParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/channels/followed` — Get Followed Channels.
 *
 * **Requires a user access token with the `user:read:follows` scope**, and
 * `user_id` must be the token's own user — Twitch does not let one account read
 * another's follow list.
 *
 * Note the direction, which is the opposite of Get Channel Followers and shares
 * three of its four parameter names: this answers "who does this user follow",
 * that one answers "who follows this broadcaster". Passing the wrong id to the
 * wrong action returns a plausible-looking 200 rather than an error.
 *
 * Setting `broadcaster_id` narrows it to "does this user follow that specific
 * broadcaster", which is the cheap way to gate a workflow on a follow.
 */
interface Input {
  userId: string;
  broadcasterId?: string;
  first?: number;
  after?: string;
}

const getFollowedChannels: ActionDefinition<Input> = {
  key: "get-followed-channels",
  type: "read",
  title: "Get Followed Channels",
  description:
    "List the broadcasters a user follows, or check whether they follow one specific broadcaster. " +
    "Requires a user access token with the user:read:follows scope, for that same user.",
  resource: "channel",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "141981764",
      hint: "Must be the user the access token belongs to. Use Get Users with no parameters and " +
        "a user token to discover it.",
    },
    {
      key: "broadcasterId",
      label: "Broadcaster ID (follow check)",
      type: "string",
      hint: "Set to check whether the user follows this one broadcaster. The response contains " +
        "them if so, and is empty if not.",
    },
    firstParam(100, 20),
    afterParam,
  ],
  output: [
    { key: "total", type: "number", label: "Total channels followed" },
    { key: "data", type: "array", label: "Followed channels" },
    { key: "data[].broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].broadcaster_login", type: "string", label: "Broadcaster login" },
    { key: "data[].broadcaster_name", type: "string", label: "Broadcaster display name" },
    { key: "data[].followed_at", type: "string", label: "Followed at (RFC3339)" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get followed channels");
    return await new TwitchClient(ctx).get("/channels/followed", {
      user_id: input.userId,
      broadcaster_id: input.broadcasterId,
      first: input.first,
      after: input.after,
    });
  },
};

export default getFollowedChannels;
