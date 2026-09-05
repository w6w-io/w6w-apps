import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/**
 * GET /files/{file_id}/content — returns the raw file bytes
 * (`application/octet-stream`), used to pull down a completed batch's
 * `output_file_id` / `error_file_id` JSONL. Base64-encoded on the way out,
 * same reasoning as `audio-speech`.
 */
const filesDownload: ActionDefinition<Input> = {
  key: "files-download",
  type: "read",
  resource: "file",
  title: "Download File Content",
  description: "Download the contents of an uploaded or batch-output file.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],
  output: [
    { key: "base64", type: "string", label: "Content (base64)" },
    { key: "contentType", type: "string", label: "Content type" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.requestBinary(`/files/${encodeURIComponent(input.fileId)}/content`);
  },
};

export default filesDownload;
