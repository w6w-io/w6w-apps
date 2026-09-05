import type { ActionDefinition } from "@w6w/types";
import { KintoneClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
}

interface Output {
  content: string;
  contentType: string;
}

/**
 * `GET /k/v1/file.json` — verified against
 * `docs/kintone/rest-api/files/download-file` 2026-09-05.
 *
 * `fileKey` comes from an Attachment field's value in a record already read
 * via `record-get`/`records-search` — NOT the `fileKey` `file-upload` returns,
 * which is different and only valid for attaching a new upload to a record.
 * The response is raw bytes with the file's own `Content-Type`; this action
 * base64-encodes them into `content` since Action output must be JSON-safe.
 */
const action: ActionDefinition<Input, Output> = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Download File",
  description:
    "Download a file attached to a record, by the fileKey found on its Attachment field.",
  params: [
    {
      key: "fileKey",
      label: "File Key",
      type: "string",
      required: true,
      hint: "From an Attachment field's value on a record already read, e.g. " +
        "`record.file.value[0].fileKey` — not the fileKey `file-upload` returns.",
    },
  ],
  output: [
    { key: "content", label: "Content (base64)", type: "string" },
    { key: "contentType", label: "Content Type", type: "string" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "downloading Kintone file", { fileKey: input.fileKey });
    const res = await new KintoneClient(ctx).request<Response>("/file", {
      query: { fileKey: input.fileKey },
      raw: true,
    });
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (const byte of buf) binary += String.fromCharCode(byte);
    return {
      content: btoa(binary),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  },
};

export default action;
