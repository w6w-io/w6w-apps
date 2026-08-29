import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  fileName: string;
  content: string;
  message?: string;
}

const BOUNDARY = "w6wChatworkUploadBoundary4b8e21fa";

function escapeHeaderValue(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

/**
 * Hand-builds a `multipart/form-data` body as plain text.
 *
 * Every `ctx.fetch` body in this sandbox is coerced to a string on its way to
 * the network, so a real `FormData`/binary body would not survive the trip
 * intact. Restricting this action to UTF-8 text content and building the
 * multipart payload as a string up front keeps the body a string end to end
 * — the same pattern this pack already uses for Box's upload action.
 */
function buildMultipart(fileName: string, content: string, message: string | undefined): string {
  const safeName = escapeHeaderValue(fileName);
  const parts = [
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n` +
    `${content}\r\n`,
  ];
  if (message) {
    parts.push(
      `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="message"\r\n\r\n` +
        `${message}\r\n`,
    );
  }
  parts.push(`--${BOUNDARY}--\r\n`);
  return parts.join("");
}

/**
 * `POST /rooms/{room_id}/files` — upload a file to a chat.
 *
 * The vendor documents a 5 MB limit and an optional `message` posted
 * alongside the file. Binary uploads are not supported by this action — see
 * {@link buildMultipart}.
 */
const roomFileUpload: ActionDefinition<Input> = {
  key: "room-file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload UTF-8 text content to a chat as a new file (vendor limit: 5 MB).",
  idempotent: false,
  params: [
    roomIdParam,
    { key: "fileName", label: "File Name", type: "string", required: true, hint: "e.g. notes.txt" },
    {
      key: "content",
      label: "File Content",
      type: "text",
      required: true,
      hint: "UTF-8 text to write. Binary uploads are not supported by this action.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "Optional message posted alongside the upload.",
    },
  ],
  output: [{ key: "file_id", type: "number", label: "New file ID" }],

  execute(input, ctx) {
    const body = buildMultipart(input.fileName, input.content, input.message);
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/files`, {
      method: "POST",
      rawBody: { contentType: `multipart/form-data; boundary=${BOUNDARY}`, text: body },
    });
  },
};

export default roomFileUpload;
