import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  filename: string;
  fileContent: string;
  channels?: string;
  initialComment?: string;
  threadTs?: string;
  title?: string;
  contentType?: string;
}

/**
 * Uses Slack's v2 upload flow (getUploadURLExternal → PUT → completeUploadExternal),
 * which superseded the deprecated `files.upload` endpoint. Accepts UTF-8 text or
 * base64 (via `data:...;base64,...`) content.
 */
const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Uploads a file to Slack (files.getUploadURLExternal + completeUploadExternal).",
  params: [
    { key: "filename", label: "Filename", type: "string", required: true },
    {
      key: "fileContent",
      label: "File content",
      type: "text",
      required: true,
      hint: "Plain text or `data:<mime>;base64,<payload>`.",
    },
    {
      key: "channels",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated. Where to share the uploaded file.",
    },
    { key: "initialComment", label: "Initial comment", type: "text" },
    { key: "threadTs", label: "Thread ts", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "contentType", label: "Content type", type: "string", default: "text/plain" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);

    // Decode either a data-URL base64 payload or a plain text string.
    let bytes: Uint8Array;
    let contentType = input.contentType ?? "text/plain";
    const match = input.fileContent.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      contentType = match[1];
      bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    } else {
      bytes = new TextEncoder().encode(input.fileContent);
    }

    // Step 1: reserve an upload URL.
    const reserve = await client.request<{ upload_url?: string; file_id?: string }>(
      "/files.getUploadURLExternal",
      { query: { filename: input.filename, length: bytes.length } },
    );

    // Step 2: POST the file bytes to the reserved URL (multipart/form-data).
    if (!reserve.upload_url) throw new Error("Slack did not return an upload_url");
    const form = new FormData();
    // Copy into a fresh ArrayBuffer so Blob's BlobPart accepts it across TS lib flavors.
    const arrayBuffer = new Uint8Array(bytes).buffer;
    form.append("file", new Blob([arrayBuffer], { type: contentType }), input.filename);
    await ctx.fetch(reserve.upload_url, { method: "POST", body: form });

    // Step 3: complete the upload.
    const complete = await client.request("/files.completeUploadExternal", {
      method: "POST",
      body: {
        files: [{ id: reserve.file_id, title: input.title ?? input.filename }],
        channel_id: input.channels,
        initial_comment: input.initialComment,
        thread_ts: input.threadTs,
      },
    });
    return complete;
  },
};

export default fileUpload;
