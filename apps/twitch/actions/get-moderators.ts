import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";
import { afterParam, broadcasterIdParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/moderation/moderators` — Get Moderators.
 *
 * **Requires a user access token with the `moderation:read` scope** (or
 * `channel:manage:moderators`, which Twitch accepts in its place for apps that
 * also add and remove moderators), and `broadcaster_id` must be the token's own
 * user. A broadcaster can only read their own moderator list.
 *
 * `user_id` is a repeated key, up to 100 ids, and filters the answer to those of
 * the given users who *are* moderators — returned in the order asked for. That
 * makes it the cheap way to check "is this person a mod here", without paging
 * the whole list.
 */
interface Input {
  broadcasterId: string;
  userId?: string[] | string;
  first?: number;
  after?: string;
}

const getModerators: ActionDefinition<Input> = {
  key: "get-moderators",
  type: "read",
  title: "Get Moderators",
  description:
    "List the users allowed to moderate a broadcaster's chat room, or check whether specific " +
    "users are among them. Requires a user access token with the moderation:read scope, for the " +
    "broadcaster themselves.",
  resource: "moderation",
  params: [
    broadcasterIdParam(
      "Must be the user the access token belongs to — a broadcaster can only read their own " +
        "moderator list.",
    ),
    {
      key: "userId",
      label: "User IDs (membership check)",
      type: "string",
      hint:
        "One or more user IDs, comma-separated, up to 100. Only those who are moderators come " +
        "back, in the order given.",
    },
    firstParam(100, 20),
    afterParam,
  ],
  output: [
    { key: "data", type: "array", label: "Moderators" },
    { key: "data[].user_id", type: "string", label: "Moderator user ID" },
    { key: "data[].user_login", type: "string", label: "Moderator login" },
    { key: "data[].user_name", type: "string", label: "Moderator display name" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get moderators");
    return await new TwitchClient(ctx).get("/moderation/moderators", {
      broadcaster_id: input.broadcasterId,
      user_id: toList(input.userId),
      first: input.first,
      after: input.after,
    });
  },
};

export default getModerators;
