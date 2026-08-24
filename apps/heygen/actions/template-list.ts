import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  token?: string;
}

/** `GET /v3/templates` — templates created in the HeyGen app. Cursor-paginated, default 10, max 100. */
const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List templates available in the workspace.",
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
    { key: "items", type: "array", label: "Templates" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/templates", {
      query: { limit: input.limit, token: input.token },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default templateList;
