import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/** `GET /v2/chats` — see `device-list.ts` for why the pagination params are offered here too. */
interface Input {
  modifiedAfter?: number;
  active?: boolean;
  cursor?: string;
  limit?: number;
}

interface ChatListResponse {
  chats?: unknown[];
  cursor?: string;
}

const chatList: ActionDefinition<Input> = {
  key: "chat-list",
  type: "read",
  resource: "chat",
  title: "List Chats",
  description: "List chats belonging to the current user, most recently modified first.",
  params: [
    { key: "modifiedAfter", label: "Modified after", type: "number", advanced: true },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "cursor", label: "Cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 50, validation: { min: 1, max: 500 } },
  ],
  output: [
    { key: "chats", type: "array", label: "Chats" },
    { key: "cursor", type: "string", label: "Cursor for the next page, if any" },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<ChatListResponse>("/chats", {
      query: compact({
        modified_after: input.modifiedAfter,
        active: input.active,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { chats: body.chats ?? [], cursor: body.cursor };
  },
};

export default chatList;
