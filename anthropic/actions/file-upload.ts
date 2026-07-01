import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient, base64ToBytes, BETA_FILES_API } from "../lib/client.ts";

interface Input {
  file: string;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * POST /v1/files — upload a file for later reference from `/v1/messages`.
 * Requires the `files-api-2025-04-14` beta header (verified 2026-07-01;
 * still beta at time of writing).
 */
const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file for use in a Message (referenced by file_id). Beta: files-api.",
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents.",
    },
    { key: "fileName", label: "File name", type: "string", default: "upload.bin" },
    {
      key: "fileMimeType",
      label: "File MIME type",
      type: "string",
      default: "application/octet-stream",
    },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], {
        type: input.fileMimeType ?? "application/octet-stream",
      }),
      input.fileName ?? "upload.bin",
    );

    return client.request("/v1/files", {
      method: "POST",
      form,
      headers: { "anthropic-beta": BETA_FILES_API },
    });
  },
};

export default fileUpload;
