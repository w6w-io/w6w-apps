import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  inclusive?: boolean;
  latest?: string;
  oldest?: string;
  limit?: number;
  cursor?: string;
}

/** Convert an ISO date string to Slack's decimal-seconds `ts` format. */
function toSlackTs(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  return new Date(iso).getTime() / 1000;
}

const channelHistory: ActionDefinition<Input> = {
  key: "channel-history",
  type: "read",
  resource: "channel",
  title: "Get Channel History",
  description: "Fetches a page of messages from a channel (conversations.history).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "inclusive", label: "Inclusive", type: "boolean" },
    { key: "latest", label: "Latest", type: "datetime" },
    { key: "oldest", label: "Oldest", type: "datetime" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.history", {
      query: {
        channel: input.channelId,
        inclusive: input.inclusive,
        latest: toSlackTs(input.latest),
        oldest: toSlackTs(input.oldest),
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
  },
};

export default channelHistory;
