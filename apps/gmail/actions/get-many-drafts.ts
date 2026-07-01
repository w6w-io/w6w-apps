import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  q?: string;
  includeSpamTrash?: boolean;
  maxResults?: number;
  pageToken?: string;
}

interface ListResponse {
  drafts?: Array<{ id: string; message: { id: string; threadId: string } }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * List drafts. Same pagination story as messages: pass `pageToken` back to
 * walk pages.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/list
 */
const getManyDrafts: ActionDefinition<Input> = {
  key: "get-many-drafts",
  type: "read",
  resource: "draft",
  title: "Get Many Drafts",
  description: "List Gmail drafts.",
  params: [
    { key: "q", label: "Query", type: "string" },
    { key: "includeSpamTrash", label: "Include Spam/Trash", type: "boolean", default: false },
    { key: "maxResults", label: "Max Results", type: "number", default: 100 },
    { key: "pageToken", label: "Page Token", type: "string" },
  ],
  output: [
    { key: "drafts", type: "array", label: "Drafts" },
    { key: "nextPageToken", type: "string", label: "Next Page Token" },
    { key: "resultSizeEstimate", type: "number", label: "Result Size Estimate" },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request<ListResponse>("/users/me/drafts", {
      query: {
        q: input.q,
        includeSpamTrash: input.includeSpamTrash,
        maxResults: input.maxResults ?? 100,
        pageToken: input.pageToken,
      },
    });
  },
};

export default getManyDrafts;
