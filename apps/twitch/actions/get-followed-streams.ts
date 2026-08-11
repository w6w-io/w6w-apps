import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { afterParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/streams/followed` — Get Followed Streams.
 *
 * **Requires a user access token with the `user:read:follows` scope**, and
 * `user_id` must be the token's own user.
 *
 * "Which of the people I follow are live right now" — the same row shape as Get
 * Streams, filtered to the user's follow list and to live broadcasters. An
 * empty list means none of them are streaming, not that the user follows
 * nobody; Get Followed Channels answers that.
 *
 * The one place this endpoint differs from its siblings: Twitch's default
 * `first` here is **100**, not 20.
 */
interface Input {
  userId: string;
  first?: number;
  after?: string;
}

const getFollowedStreams: ActionDefinition<Input> = {
  key: "get-followed-streams",
  type: "search",
  title: "Get Followed Streams",
  description:
    "List the broadcasters a user follows who are live right now, most viewers first. Requires a " +
    "user access token with the user:read:follows scope, for that same user.",
  resource: "stream",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "141981764",
      hint: "Must be the user the access token belongs to.",
    },
    firstParam(100, 100),
    afterParam,
  ],
  output: [
    { key: "data", type: "array", label: "Live followed streams" },
    { key: "data[].id", type: "string", label: "Stream ID" },
    { key: "data[].user_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].user_login", type: "string", label: "Broadcaster login" },
    { key: "data[].game_name", type: "string", label: "Category name" },
    { key: "data[].title", type: "string", label: "Stream title" },
    { key: "data[].viewer_count", type: "number", label: "Current viewers" },
    { key: "data[].started_at", type: "string", label: "Started at (RFC3339)" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get followed streams");
    return await new TwitchClient(ctx).get("/streams/followed", {
      user_id: input.userId,
      first: input.first,
      after: input.after,
    });
  },
};

export default getFollowedStreams;
