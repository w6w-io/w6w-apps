import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, DOCUMENT_MIME, GoogleDriveClient, resolveParent } from "../lib/client.ts";

interface Input {
  content: string;
  name?: string;
  parentFolderId?: string;
  parentDriveId?: string;
  convertToGoogleDocument?: boolean;
}

/**
 * Uploads text content as a new file. Uses multipart upload so we can attach
 * metadata (name, parents, mimeType) alongside the body in a single call.
 */
const createFromText: ActionDefinition<Input> = {
  key: "file-create-from-text",
  type: "perform",
  resource: "file",
  title: "Create File from Text",
  description: "Create a new file whose contents are the given text.",
  params: [
    { key: "content", label: "Content", type: "text", required: true },
    { key: "name", label: "File Name", type: "string", default: "Untitled" },
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    { key: "parentDriveId", label: "Parent Drive ID", type: "string" },
    {
      key: "convertToGoogleDocument",
      label: "Convert to Google Document",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const mimeType = input.convertToGoogleDocument ? DOCUMENT_MIME : "text/plain";
    const metadata: Record<string, unknown> = {
      name: input.name || "Untitled",
      mimeType,
      parents: [resolveParent(input.parentFolderId, input.parentDriveId)],
    };
    return client.multipartUpload(metadata, input.content, mimeType, {
      ...ALL_DRIVES_QS,
    });
  },
};

export default createFromText;
