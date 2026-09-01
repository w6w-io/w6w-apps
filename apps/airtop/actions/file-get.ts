import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";

/** `GET /v1/files/{id}` — file metadata plus a download URL. */
interface Input {
  fileId: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Get a file's metadata and a download URL.",
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "fileName", type: "string", label: "File name" },
    { key: "fileType", type: "string", label: "File type" },
    { key: "status", type: "string", label: "Status" },
    { key: "fileBytes", type: "number", label: "Size (bytes)" },
    { key: "downloadUrl", type: "string", label: "Download URL" },
    { key: "expiryTime", type: "string", label: "Expires at" },
    { key: "sessionIds", type: "array", label: "Associated session IDs" },
  ],

  execute(input, ctx) {
    return new AirtopClient(ctx).data(`/v1/files/${encodeURIComponent(input.fileId)}`);
  },
};

export default fileGet;
