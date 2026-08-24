import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  token?: string;
}

/** `GET /v3/video-translations` — cursor-paginated, default page size 10, max 100. */
const videoTranslationList: ActionDefinition<Input> = {
  key: "video-translation-list",
  type: "search",
  resource: "video-translation",
  title: "List Video Translations",
  description: "List video translation jobs in the workspace.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "1-100. Default 10." },
    {
      key: "token",
      label: "Page token",
      type: "string",
      hint: "From a previous call's nextToken.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Video translations" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/video-translations", {
      query: { limit: input.limit, token: input.token },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default videoTranslationList;
