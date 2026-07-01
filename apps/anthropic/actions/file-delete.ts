import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient, BETA_FILES_API } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/**
 * DELETE /v1/files/{id} — permanently remove an uploaded file. Requires the
 * `files-api-2025-04-14` beta header.
 */
const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete an uploaded file. Beta: files-api.",
  idempotent: true,
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/files/${input.fileId}`, {
      method: "DELETE",
      headers: { "anthropic-beta": BETA_FILES_API },
    });
  },
};

export default fileDelete;
