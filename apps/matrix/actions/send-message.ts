import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  body: string;
  msgtype?: string;
  formattedBody?: string;
}

interface Output {
  eventId: string;
}

/**
 * `PUT /_matrix/client/v3/rooms/{roomId}/send/{eventType}/{txnId}` with
 * `eventType` fixed to `m.room.message` — the message-event send endpoint.
 *
 * When `formattedBody` (HTML) is supplied, `format` is set to
 * `org.matrix.custom.html` — the value every Matrix client (Element
 * included) expects for rich messages, per the spec's "Extensions to
 * m.room.message msgtypes".
 *
 * ## Why this action is idempotent, and what makes it safe
 *
 * A `perform` that posts a message would normally be exactly the case where
 * "safe to retry" is false — retrying a plain HTTP POST would post twice.
 * But `{txnId}` is not incidental here: the spec states it plainly — "Clients
 * should generate an ID unique across requests with the same access token; it
 * will be used by the server to ensure idempotency of requests." This action
 * uses `ctx.invocation.invocationId` (falling back to a random id outside a
 * tracked invocation) as that transaction id, so retrying the *same*
 * invocation reuses the *same* txnId, and the homeserver itself — not this
 * app — is what de-duplicates the send.
 */
const sendMessage: ActionDefinition<Input, Output> = {
  key: "send-message",
  type: "perform",
  title: "Send Message",
  description: "Send a message into a room.",
  idempotent: true,
  params: [
    {
      key: "roomId",
      label: "Room ID",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org",
    },
    { key: "body", label: "Message", type: "text", required: true },
    {
      key: "msgtype",
      label: "Message Type",
      type: "select",
      default: "m.text",
      options: [
        { value: "m.text", label: "Text" },
        { value: "m.notice", label: "Notice (bot-style, suppressed by some clients' rules)" },
        { value: "m.emote", label: 'Emote ("/me does a thing")' },
      ],
      advanced: true,
    },
    {
      key: "formattedBody",
      label: "Formatted Message (HTML)",
      type: "text",
      hint: "Optional. Rich HTML rendering of the message, shown by clients that support it; " +
        "plain-text clients fall back to Message.",
      advanced: true,
    },
  ],
  output: [{ key: "eventId", type: "string", label: "Event ID" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const txnId = ctx.invocation?.invocationId ?? crypto.randomUUID();
    const content = compact({
      msgtype: input.msgtype ?? "m.text",
      body: input.body,
      format: input.formattedBody ? "org.matrix.custom.html" : undefined,
      formatted_body: input.formattedBody,
    });
    const res = await client.request<{ event_id: string }>(
      `/rooms/${seg(input.roomId)}/send/m.room.message/${seg(txnId)}`,
      { method: "PUT", body: content },
    );
    return { eventId: res.event_id };
  },
};

export default sendMessage;
