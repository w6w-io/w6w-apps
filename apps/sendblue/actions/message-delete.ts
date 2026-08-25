import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  messageHandle: string;
}

/**
 * `DELETE /api/message/{message_handle}` — note the SINGULAR, unversioned
 * `/api/message/...`, the only message operation with no `/v2` form at all
 * (every other message endpoint is either `/api/v2/messages/...` or a bare
 * `/api/...` path — never this exact shape). Confirmed against
 * `api/resources/messages` and the hand-authored `messages` guide, which agree
 * on this one path, 2026-08-25.
 *
 * This is a SOFT delete: it removes the message from Sendblue's own database
 * only. It does not unsend or recall the message from the recipient's device.
 */
const messageDelete: ActionDefinition<Input> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Soft-delete a message from Sendblue's database. Does NOT unsend/recall it on " +
    "the recipient's device.",
  idempotent: true,
  params: [
    { key: "messageHandle", label: "Message handle", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.delete(`/api/message/${encodeURIComponent(input.messageHandle)}`);
  },
};

export default messageDelete;
