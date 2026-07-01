import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  types?: string;
  excludeArchived?: boolean;
  limit?: number;
  cursor?: string;
}

const channelGetMany: ActionDefinition<Input> = {
  key: "channel-get-many",
  type: "read",
  resource: "channel",
  title: "Get Many Channels",
  description: "Lists channels visible to the token (conversations.list).",
  params: [
    {
      key: "types",
      label: "Types",
      type: "string",
      hint: "Comma-separated. e.g. `public_channel,private_channel,mpim,im`.",
      default: "public_channel,private_channel",
    },
    { key: "excludeArchived", label: "Exclude archived", type: "boolean" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],
  output: [
    { key: "channels", type: "array", label: "Channels" },
    { key: "response_metadata", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/conversations.list", {
      query: {
        types: input.types ?? "public_channel,private_channel",
        exclude_archived: input.excludeArchived,
        limit: input.limit ?? 100,
        cursor: input.cursor,
      },
    });
  },
};

export default channelGetMany;
