import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient, flag } from "../lib/client.ts";
import { fileIdParam, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  fileId: number;
  createDownloadUrl?: boolean;
}

/**
 * `GET /rooms/{room_id}/files/{file_id}` — one file's metadata, optionally
 * with a time-limited download URL.
 */
const roomFileGet: ActionDefinition<Input> = {
  key: "room-file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Fetch one file's metadata, optionally with a download URL.",
  params: [
    roomIdParam,
    fileIdParam,
    {
      key: "createDownloadUrl",
      label: "Create download URL",
      type: "boolean",
      default: false,
      hint: "Mints a time-limited direct download URL for the file.",
    },
  ],
  output: [
    { key: "file_id", type: "number", label: "File ID" },
    { key: "account", type: "object", label: "Who uploaded it" },
    { key: "message_id", type: "string", label: "The message ID the file came from" },
    { key: "filename", type: "string", label: "File name" },
    { key: "filesize", type: "number", label: "Size in bytes" },
    { key: "upload_time", type: "number", label: "Uploaded at (Unix seconds)" },
    { key: "download_url", type: "string", label: "Download URL, only when requested" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/files/${input.fileId}`,
      { query: { create_download_url: flag(input.createDownloadUrl) } },
    );
  },
};

export default roomFileGet;
