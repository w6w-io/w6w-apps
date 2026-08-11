import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `GET /api/v4/users/{user_id}/teams/{team_id}/channels` — the channels a user
 * is in, on one team.
 *
 * Pass `me` as the user id to mean "this connection's own user" — Mattermost
 * accepts that alias wherever a user id is taken, which saves a lookup and is
 * the usual thing a workflow wants ("which channels can this bot see?").
 *
 * The sibling endpoint `GET /api/v4/channels` lists *every* channel on the
 * server and requires system-admin permission, so it is not shipped: a bot
 * asking what it can reach should not need to be an admin.
 */
interface Input {
  userId?: string;
  teamId: string;
  includeDeleted?: boolean;
  lastDeleteAt?: number;
}

const channelsForUser: ActionDefinition<Input> = {
  key: "channels-for-user",
  type: "search",
  resource: "channel",
  title: "List Channels for User",
  description:
    "List the channels a user belongs to on a team. Defaults to this connection's own user.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      default: "me",
      hint: "`me` (the default) means the user this connection authenticates as.",
    },
    { key: "teamId", label: "Team ID", type: "string", required: true },
    {
      key: "includeDeleted",
      label: "Include archived",
      type: "boolean",
    },
    {
      key: "lastDeleteAt",
      label: "Deleted since (ms timestamp)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Include channels archived after this Unix millisecond timestamp.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Channels — a bare array, not an envelope" }],

  execute(input, ctx) {
    const userId = input.userId?.trim() || "me";
    return new MattermostClient(ctx).request(
      `/api/v4/users/${encodeURIComponent(userId)}/teams/${
        encodeURIComponent(input.teamId)
      }/channels`,
      { query: { include_deleted: input.includeDeleted, last_delete_at: input.lastDeleteAt } },
    );
  },
};

export default channelsForUser;
