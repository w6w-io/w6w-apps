import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  ownership?: "public" | "private";
  limit?: number;
  token?: string;
}

/**
 * `GET /v3/avatars` — avatar groups (characters), each a container for one or more "looks"
 * (outfits/styles). A group's own `id` is NOT what `video-create` expects for `avatarId` — that is
 * a look-level id, from `avatar-look-list`.
 */
const avatarGroupList: ActionDefinition<Input> = {
  key: "avatar-group-list",
  type: "search",
  resource: "avatar",
  title: "List Avatar Groups",
  description: "List avatar groups (characters). Each group contains one or more looks — use " +
    "List Avatar Looks to find the look ID to pass to Create Avatar Video.",
  params: [
    {
      key: "ownership",
      label: "Ownership",
      type: "select",
      options: [{ value: "public", label: "Public" }, { value: "private", label: "Private" }],
    },
    { key: "limit", label: "Limit", type: "number", default: 20, hint: "1-50. Default 20." },
    {
      key: "token",
      label: "Page token",
      type: "string",
      hint: "From a previous call's nextToken.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Avatar groups" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/avatars", {
      query: { ownership: input.ownership, limit: input.limit, token: input.token },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default avatarGroupList;
