import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  q?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  maxResults?: number;
  pageToken?: string;
}

interface ListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * List messages matching a Gmail search query. Returns only IDs — call
 * `get-message` per ID to hydrate. Walks one page; pass `pageToken` back to
 * get the next.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 */
const getManyMessages: ActionDefinition<Input> = {
  key: "get-many-messages",
  type: "read",
  resource: "message",
  title: "Get Many Messages",
  description: "List Gmail messages. Returns IDs; hydrate individually with Get Message.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      hint: "Gmail search query, e.g. `from:foo@bar.com is:unread`.",
    },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true },
    { key: "includeSpamTrash", label: "Include Spam/Trash", type: "boolean", default: false },
    { key: "maxResults", label: "Max Results", type: "number", default: 100 },
    { key: "pageToken", label: "Page Token", type: "string" },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "nextPageToken", type: "string", label: "Next Page Token" },
    { key: "resultSizeEstimate", type: "number", label: "Result Size Estimate" },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request<ListResponse>("/users/me/messages", {
      query: {
        q: input.q,
        labelIds: input.labelIds,
        includeSpamTrash: input.includeSpamTrash,
        maxResults: input.maxResults ?? 100,
        pageToken: input.pageToken,
      },
    });
  },
};

export default getManyMessages;
