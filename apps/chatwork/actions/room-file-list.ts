import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  accountId?: number;
}

/**
 * `GET /rooms/{room_id}/files` — a chat's uploaded files (metadata only; use
 * Get File to fetch a download URL).
 *
 * Documents a `204 No Content` for the empty case; {@link ChatworkClient.list}
 * normalises that to `[]`.
 */
const roomFileList: ActionDefinition<Input> = {
  key: "room-file-list",
  type: "read",
  resource: "file",
  title: "List Chat Files",
  description: "List a chat's uploaded files. Use Get File for a download URL.",
  params: [
    roomIdParam,
    {
      key: "accountId",
      label: "Uploaded by (Account ID)",
      type: "number",
      hint: "Only files uploaded by this account.",
    },
  ],
  output: [
    { key: "file_id", type: "number", label: "File ID" },
    { key: "account", type: "object", label: "Who uploaded it" },
    { key: "message_id", type: "string", label: "The message ID the file came from" },
    { key: "filename", type: "string", label: "File name" },
    { key: "filesize", type: "number", label: "Size in bytes" },
    { key: "upload_time", type: "number", label: "Uploaded at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).list(`/rooms/${encodeURIComponent(input.roomId)}/files`, {
      query: { account_id: input.accountId },
    });
  },
};

export default roomFileList;
