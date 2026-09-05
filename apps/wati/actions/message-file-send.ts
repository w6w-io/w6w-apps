import type { ActionDefinition } from "@w6w/types";
import { compact, WatiClient } from "../lib/client.ts";
import { CONVERSATION_TARGET_PARAM } from "../lib/params.ts";

interface Input {
  target: string;
  fileUrl: string;
  caption?: string;
  isBot?: boolean;
}

interface MessageDto {
  id?: string;
  type?: string;
  status?: string;
  local_message_id?: string;
  conversation_id?: string;
}

interface SendFileResponse {
  message?: MessageDto;
}

/**
 * `POST /api/ext/v3/conversations/messages/fileViaUrl` — verified against the embedded OpenAPI
 * document 2026-09-05. Sends a file by URL (rather than uploading bytes) into an ACTIVE
 * conversation — same 24-hour session requirement as `message-text-send`.
 *
 * Not marked idempotent: retrying sends a second, duplicate file message.
 */
const action: ActionDefinition<Input, SendFileResponse> = {
  key: "message-file-send",
  type: "perform",
  resource: "conversations",
  title: "Send Session File Message",
  description: "Send a file, by URL, into an active (within 24h) conversation.",
  idempotent: false,
  params: [
    { ...CONVERSATION_TARGET_PARAM },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      required: true,
      hint: "A publicly reachable URL Wati fetches the file from.",
    },
    { key: "caption", label: "Caption", type: "string" },
    {
      key: "isBot",
      label: "Send As Bot",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Instagram conversations only. Ignored for WhatsApp conversations.",
    },
  ],
  output: [
    { key: "message", label: "Sent Message", type: "object" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "sending Wati session file message", { target: input.target });
    return await new WatiClient(ctx).post<SendFileResponse>(
      "/conversations/messages/fileViaUrl",
      compact({
        target: input.target,
        file_url: input.fileUrl,
        caption: input.caption,
        is_bot: input.isBot,
      }),
    );
  },
};

export default action;
