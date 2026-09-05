import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/chats/{id}` — one conversation's details. */
interface Input {
  id: number;
}

const chatGet: ActionDefinition<Input> = {
  key: "chat-get",
  type: "read",
  resource: "chat",
  title: "Get Chat",
  description: "Fetch one two-way conversation.",
  params: [{ key: "id", label: "Chat ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Chat ID" },
    { key: "phone", type: "string", label: "Chat partner's phone number" },
    { key: "unread", type: "number", label: "Unread incoming messages" },
    { key: "status", type: "string", label: "a (Active) / c (Closed) / d (Deleted)" },
    { key: "lastMessage", type: "string", label: "Last message content" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/chats/${encodeURIComponent(input.id)}`);
  },
};

export default chatGet;
