import type { ActionDefinition } from "@w6w/types";
import { type FileDetailResponse, ManusClient, type ManusFileDetail } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/**
 * `GET /v2/file.detail` — a file's upload status, size and expiration.
 * Check `status === "uploaded"` before referencing it from a task; files
 * expire (and are deleted) 48 hours after upload.
 */
const fileDetail: ActionDefinition<Input, ManusFileDetail> = {
  key: "file-detail",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieve a file's upload status, size and expiration.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "filename", type: "string", label: "File name" },
    { key: "status", type: "string", label: "pending | uploaded | deleted | error" },
    { key: "bytes", type: "number", label: "Size in bytes, once uploaded" },
    { key: "content_type", type: "string", label: "MIME type" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "expires_at", type: "number", label: "Auto-deletion time (Unix seconds)" },
    { key: "error_message", type: "string", label: "Set when status is error" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<FileDetailResponse>("/v2/file.detail", {
      query: { file_id: input.fileId },
    });
    return res.file;
  },
};

export default fileDetail;
