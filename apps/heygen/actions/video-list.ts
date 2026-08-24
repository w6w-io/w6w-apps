import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  token?: string;
  folderId?: string;
  title?: string;
}

/**
 * `GET /v3/videos` — cursor-paginated, default page size 10, max 100 (per HeyGen's Usage Limits
 * doc). `next_token` sits BESIDE `data` in the response, not inside it — see `HeyGenClient.list`.
 */
const videoList: ActionDefinition<Input> = {
  key: "video-list",
  type: "search",
  resource: "video",
  title: "List Videos",
  description: "List videos in the workspace, newest first, optionally filtered by folder/title.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "1-100. Default 10." },
    {
      key: "token",
      label: "Page token",
      type: "string",
      hint: "From a previous call's nextToken.",
    },
    { key: "folderId", label: "Folder ID", type: "string" },
    { key: "title", label: "Title filter", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Videos" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/videos", {
      query: {
        limit: input.limit,
        token: input.token,
        folder_id: input.folderId,
        title: input.title,
      },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default videoList;
