import type { ActionDefinition } from "@w6w/types";
import { listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  include?: string;
}

const sessionChatMessagesList: ActionDefinition<Input> = {
  key: "session-chat-messages-list",
  type: "search",
  resource: "session",
  title: "List Session Chat Messages",
  description: "List the chat messages sent during a session.",
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [{ label: "People", value: "people" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Chat messages" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/sessions/${encodeURIComponent(input.id)}/chat_messages`,
      { query: listQuery(input) },
    );
  },
};

export default sessionChatMessagesList;
