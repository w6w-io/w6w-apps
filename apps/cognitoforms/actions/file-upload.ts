import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, CognitoFormsClient } from "../lib/client.ts";

interface Input {
  file: string;
  fileName?: string;
}

/**
 * POST /files — upload a file and get back a File ID usable in Create/Update Entry for a File
 * Upload field. The ID expires after 48 hours if not attached to an entry. Requires
 * `Entry:Read/Write`.
 */
const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file, returning a File ID to attach to an entry within 48 hours.",
  // Each upload mints a distinct File ID; a retry produces a second, unrelated file.
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents.",
    },
    { key: "fileName", label: "File name", type: "string", default: "upload.bin" },
  ],
  output: [
    { key: "Id", type: "string", label: "File ID" },
    { key: "Name", type: "string", label: "File name" },
    { key: "ContentType", type: "string", label: "MIME type" },
    { key: "Size", type: "number", label: "Size in bytes" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "uploading file to Cognito Forms", { fileName: input.fileName });
    const form = new FormData();
    form.append("File", new Blob([base64ToBytes(input.file)]), input.fileName ?? "upload.bin");
    return await new CognitoFormsClient(ctx).request("/files", { method: "POST", form });
  },
};

export default fileUpload;
