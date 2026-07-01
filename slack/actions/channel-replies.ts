import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  ts: string;
  inclusive?: boolean;
  latest?: string;
  oldest?: string;
  limit?: number;
  cursor?: string;
}

function toSlackTs(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  return new Date(iso).getTime() / 1000;
}

const channelReplies: ActionDefinition<Input> = {
  key: "channel-replies",
  type: "read",
  resource: "channel",
  title: "Get Thread Replies",
  description: "Fetches replies to a threaded message (conversations.replies).",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "ts", label: "Parent ts", type: "string", required: true },
    { key: "inclusive", label: "Inclusive", type: "boolean" },
    { key: "latest", label: "Latest", type: "datetime" },
    { key: "oldest", label: "Oldest", type: "datetime" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.replies", {
      query: {
        channel: input.channelId,
        ts: input.ts,
        inclusive: input.inclusive,
        latest: toSlackTs(input.latest),
        oldest: toSlackTs(input.oldest),
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
  },
};

export default channelReplies;
