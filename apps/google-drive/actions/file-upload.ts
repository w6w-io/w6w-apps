import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, GoogleDriveClient, resolveParent } from "../lib/client.ts";

interface Input {
  /** Base64-encoded file content. */
  contentBase64: string;
  name: string;
  mimeType?: string;
  parentFolderId?: string;
  parentDriveId?: string;
  description?: string;
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Upload a new binary file. Uses a multipart POST so metadata (name, parents,
 * mimeType) and body ship in a single request — matches the n8n v2 behavior
 * for buffer-shaped uploads.
 */
const upload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a new file with the given name and base64-encoded content.",
  params: [
    { key: "contentBase64", label: "Content (base64)", type: "text", required: true },
    { key: "name", label: "File name", type: "string", required: true },
    { key: "mimeType", label: "MIME type", type: "string", default: "application/octet-stream" },
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    { key: "parentDriveId", label: "Parent Drive ID", type: "string" },
    { key: "description", label: "Description", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const mimeType = input.mimeType || "application/octet-stream";
    const metadata: Record<string, unknown> = {
      name: input.name,
      parents: [resolveParent(input.parentFolderId, input.parentDriveId)],
    };
    if (input.description) metadata.description = input.description;
    return client.multipartUpload(metadata, fromBase64(input.contentBase64), mimeType, {
      ...ALL_DRIVES_QS,
    });
  },
};

export default upload;
