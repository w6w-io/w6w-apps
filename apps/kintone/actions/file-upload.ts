import type { ActionDefinition } from "@w6w/types";
import { KintoneClient } from "../lib/client.ts";

interface Input {
  fileName: string;
  content: string;
  encoding?: "base64" | "utf8";
  contentType?: string;
}

interface UploadFileResponse {
  fileKey: string;
}

/**
 * `POST /k/v1/file.json` — verified against
 * `docs/kintone/rest-api/files/upload-file` 2026-09-05.
 *
 * Uploads a file and returns a `fileKey` — this does NOT attach it to any
 * record. Pass that `fileKey` inside an Attachment field's value
 * (`{"value": [{"fileKey": "..."}]}`) in `record-add`/`record-update`'s
 * `record` param to actually attach it.
 */
const action: ActionDefinition<Input, UploadFileResponse> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file to Kintone and get back a fileKey for use in an Attachment field.",
  idempotent: false,
  params: [
    { key: "fileName", label: "File Name", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "The file's bytes. Base64-encoded by default; switch Encoding to Plain Text for a " +
        "text file passed verbatim.",
    },
    {
      key: "encoding",
      label: "Encoding",
      type: "select",
      default: "base64",
      options: [
        { value: "base64", label: "Base64" },
        { value: "utf8", label: "Plain text (UTF-8)" },
      ],
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "string",
      default: "application/octet-stream",
      advanced: true,
    },
  ],
  output: [{ key: "fileKey", label: "File Key", type: "string" }],

  async execute(input, ctx) {
    const bytes = input.encoding === "utf8"
      ? new TextEncoder().encode(input.content)
      : Uint8Array.from(atob(input.content), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: input.contentType || "application/octet-stream" });
    ctx.log("info", "uploading file to Kintone", { fileName: input.fileName, bytes: bytes.length });
    return await new KintoneClient(ctx).uploadFile(input.fileName, blob);
  },
};

export default action;
