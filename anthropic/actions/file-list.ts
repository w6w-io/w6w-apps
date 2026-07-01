import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient, BETA_FILES_API } from "../lib/client.ts";

interface Input {
  limit?: number;
  after_id?: string;
  before_id?: string;
}

/**
 * GET /v1/files — cursor-paginated list of every file uploaded to the account.
 * Requires the `files-api-2025-04-14` beta header.
 */
const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List every uploaded file (paginated). Beta: files-api.",
  params: [
    { key: "limit", label: "Limit", type: "number" },
    { key: "after_id", label: "After ID (cursor)", type: "string" },
    { key: "before_id", label: "Before ID (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Files" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "first_id", type: "string", label: "First ID" },
    { key: "last_id", type: "string", label: "Last ID" },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request("/v1/files", {
      query: {
        limit: input.limit,
        after_id: input.after_id,
        before_id: input.before_id,
      },
      headers: { "anthropic-beta": BETA_FILES_API },
    });
  },
};

export default fileList;
