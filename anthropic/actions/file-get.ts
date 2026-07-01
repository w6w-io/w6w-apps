import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient, BETA_FILES_API } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/**
 * GET /v1/files/{id} — metadata (name, mime, size, created_at) for one file.
 * Requires the `files-api-2025-04-14` beta header. Actual content bytes live
 * at `/v1/files/{id}/content` and aren't modelled here to keep the action
 * output JSON-shaped.
 */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieve metadata for one uploaded file. Beta: files-api.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/files/${input.fileId}`, {
      headers: { "anthropic-beta": BETA_FILES_API },
    });
  },
};

export default fileGet;
