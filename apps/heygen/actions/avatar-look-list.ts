import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  groupId?: string;
  avatarType?: "studio_avatar" | "digital_twin" | "photo_avatar";
  ownership?: "public" | "private";
  limit?: number;
  token?: string;
}

/**
 * `GET /v3/avatars/looks` — a look's own `id` field is the value to pass as `avatarId` to
 * `video-create` (HeyGen's docs are explicit: "The look ID is what you pass as avatar_id").
 */
const avatarLookList: ActionDefinition<Input> = {
  key: "avatar-look-list",
  type: "search",
  resource: "avatar",
  title: "List Avatar Looks",
  description:
    "List avatar looks (outfits/styles/poses). A look's ID is the avatarId Create Avatar Video " +
    "expects.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", hint: "Filter to one avatar group." },
    {
      key: "avatarType",
      label: "Avatar type",
      type: "select",
      options: [
        { value: "studio_avatar", label: "Studio avatar" },
        { value: "digital_twin", label: "Digital twin" },
        { value: "photo_avatar", label: "Photo avatar" },
      ],
    },
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
    { key: "items", type: "array", label: "Avatar looks" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextToken", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const page = await client.list("/v3/avatars/looks", {
      query: {
        group_id: input.groupId,
        avatar_type: input.avatarType,
        ownership: input.ownership,
        limit: input.limit,
        token: input.token,
      },
    });
    return { items: page.items, hasMore: page.hasMore, nextToken: page.nextToken };
  },
};

export default avatarLookList;
