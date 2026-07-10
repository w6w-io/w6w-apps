import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  name?: string;
  description?: string;
  starred?: boolean;
  trashed?: boolean;
  mimeType?: string;
  /** Base64-encoded new content — when supplied, we also PATCH the media. */
  contentBase64?: string;
  /** Add these parent folder IDs. */
  addParents?: string;
  /** Remove these parent folder IDs. */
  removeParents?: string;
  fields?: string;
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const updateFile: ActionDefinition<Input> = {
  key: "file-update",
  type: "perform",
  resource: "file",
  title: "Update File",
  description: "Update a file's metadata (and optionally its content).",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "starred", label: "Starred", type: "boolean" },
    { key: "trashed", label: "Trashed", type: "boolean" },
    { key: "mimeType", label: "MIME type", type: "string" },
    { key: "contentBase64", label: "New content (base64)", type: "text" },
    { key: "addParents", label: "Add parents (comma-separated)", type: "string" },
    { key: "removeParents", label: "Remove parents (comma-separated)", type: "string" },
    { key: "fields", label: "Fields", type: "string", default: "*" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);

    // Step 1: if the caller supplied new content, PATCH the media first.
    if (input.contentBase64) {
      await client.request(`/files/${input.fileId}`, {
        method: "PATCH",
        baseUrl: "https://www.googleapis.com/upload/drive/v3",
        query: { uploadType: "media", supportsAllDrives: true },
        rawBody: fromBase64(input.contentBase64) as unknown as BodyInit,
        contentType: input.mimeType ?? "application/octet-stream",
      });
    }

    // Step 2: metadata PATCH. Note: media PATCH already returns a resource but
    // we still send the metadata patch so the caller can rename etc. in one call.
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.starred !== undefined) body.starred = input.starred;
    if (input.trashed !== undefined) body.trashed = input.trashed;
    if (input.mimeType !== undefined) body.mimeType = input.mimeType;

    return client.request(`/files/${input.fileId}`, {
      method: "PATCH",
      body,
      query: {
        supportsAllDrives: true,
        addParents: input.addParents,
        removeParents: input.removeParents,
        fields: input.fields ?? "*",
      },
    });
  },
};

export default updateFile;
