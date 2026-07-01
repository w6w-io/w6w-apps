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
  threads?: Array<{ id: string; snippet?: string; historyId?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * List threads. Walks one page; pass `pageToken` back to get the next.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/list
 */
const getManyThreads: ActionDefinition<Input> = {
  key: "get-many-threads",
  type: "read",
  resource: "thread",
  title: "Get Many Threads",
  description: "List Gmail threads matching a query.",
  params: [
    { key: "q", label: "Query", type: "string" },
    { key: "labelIds", label: "Label IDs", type: "string", repeat: true },
    { key: "includeSpamTrash", label: "Include Spam/Trash", type: "boolean", default: false },
    { key: "maxResults", label: "Max Results", type: "number", default: 100 },
    { key: "pageToken", label: "Page Token", type: "string" },
  ],
  output: [
    { key: "threads", type: "array", label: "Threads" },
    { key: "nextPageToken", type: "string", label: "Next Page Token" },
    { key: "resultSizeEstimate", type: "number", label: "Result Size Estimate" },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request<ListResponse>("/users/me/threads", {
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

export default getManyThreads;
