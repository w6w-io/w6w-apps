import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";
import { toList } from "../lib/params.ts";

interface Input {
  fromNumber: string;
  numbers?: string[] | string;
  groupId?: string;
  content?: string;
  mediaUrl?: string;
  seatId?: string;
  replyTo?: unknown;
}

/**
 * `POST /api/send-group-message` — a beta feature per the vendor's own docs.
 * Send either to an existing `group_id` OR to a fresh `numbers` array (which
 * creates a new iMessage group); the two are not documented as mutually
 * exclusive but there is no worked example combining them, so this app sends
 * whichever the caller provided.
 */
const groupSendMessage: ActionDefinition<Input> = {
  key: "group-send-message",
  type: "perform",
  resource: "group",
  title: "Send Group Message",
  description: "Send a message to an existing group or a fresh list of recipients (beta).",
  idempotent: false,
  params: [
    { key: "fromNumber", label: "From (Sendblue number)", type: "string", required: true },
    {
      key: "numbers",
      label: "Recipient numbers",
      type: "multiselect",
      hint: "E.164 numbers. Creates a new group when groupId is not set.",
    },
    { key: "groupId", label: "Existing group ID", type: "string" },
    { key: "content", label: "Message text", type: "text" },
    { key: "mediaUrl", label: "Media URL", type: "string" },
    { key: "seatId", label: "Seat ID", type: "string", advanced: true },
    {
      key: "replyTo",
      label: "Reply to (JSON)",
      type: "json",
      advanced: true,
      hint: '{ "message_handle": "...", "part_index": 0 }',
    },
  ],
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/send-group-message",
      compact({
        from_number: input.fromNumber,
        numbers: toList(input.numbers),
        group_id: input.groupId,
        content: input.content,
        media_url: input.mediaUrl,
        seat_id: input.seatId,
        reply_to: asOptionalJson(input.replyTo, "replyTo"),
      }),
    );
  },
};

export default groupSendMessage;
