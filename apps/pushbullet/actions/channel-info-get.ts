import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `GET /v2/channel-info` — public metadata for a channel, by tag. The docs'
 * own example calls this **without** an access token at all, so unlike every
 * other action here it may legitimately succeed even on a broken Connection —
 * that is expected, not a bug in the health surface.
 */
interface Input {
  tag: string;
  noRecentPushes?: boolean;
}

const channelInfoGet: ActionDefinition<Input> = {
  key: "channel-info-get",
  type: "read",
  resource: "channel",
  title: "Get Channel Info",
  description: "Get public information about a channel by its tag, including recent pushes.",
  requiresAuth: false,
  params: [
    { key: "tag", label: "Channel tag", type: "string", required: true },
    {
      key: "noRecentPushes",
      label: "Omit recent pushes",
      type: "boolean",
      hint: "Skip fetching the channel's recent pushes.",
    },
  ],
  output: [
    { key: "iden", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "subscriberCount", type: "number", label: "Subscriber count" },
    { key: "recentPushes", type: "array", label: "Recent pushes" },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<Record<string, unknown>>("/channel-info", {
      query: compact({ tag: input.tag, no_recent_pushes: input.noRecentPushes }),
    });
    return {
      ...body,
      subscriberCount: body.subscriber_count,
      recentPushes: body.recent_pushes,
    };
  },
};

export default channelInfoGet;
