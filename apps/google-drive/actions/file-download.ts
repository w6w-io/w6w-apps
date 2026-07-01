import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, GoogleDriveClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  /** For Google-native docs, the export mime type (e.g. `application/pdf`). */
  exportMimeType?: string;
}

interface Result {
  name?: string;
  mimeType?: string;
  /** Base64-encoded file contents. */
  data: string;
  size: number;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const download: ActionDefinition<Input, Result> = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Download File",
  description:
    "Fetch a file's binary contents. Google-native docs are exported when `exportMimeType` is given.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "exportMimeType",
      label: "Export MIME type",
      type: "string",
      hint: "Only used for Google-native docs (Docs/Sheets/Slides/Drawings).",
    },
  ],
  output: [
    { key: "name", type: "string", label: "File name" },
    { key: "mimeType", type: "string", label: "MIME type" },
    { key: "data", type: "string", label: "Base64 body" },
    { key: "size", type: "number", label: "Byte length" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const meta = await client.request<{ name?: string; mimeType?: string }>(
      `/files/${input.fileId}`,
      { query: { fields: "name,mimeType", ...ALL_DRIVES_QS } },
    );

    const isNative = meta.mimeType?.startsWith("application/vnd.google-apps") ?? false;
    const buf = isNative && input.exportMimeType
      ? await client.request<ArrayBuffer>(`/files/${input.fileId}/export`, {
        query: { mimeType: input.exportMimeType, supportsAllDrives: true },
      })
      : await client.request<ArrayBuffer>(`/files/${input.fileId}`, {
        query: { alt: "media", supportsAllDrives: true },
      });

    const bytes = new Uint8Array(buf);
    return {
      name: meta.name,
      mimeType: isNative && input.exportMimeType ? input.exportMimeType : meta.mimeType,
      data: toBase64(bytes),
      size: bytes.byteLength,
    };
  },
};

export default download;
