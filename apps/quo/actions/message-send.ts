import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `POST /v1/messages` — send a text message from a Quo number to up to 10 recipients.
 *
 * Sending to more than one recipient sends a single **group** message to all of them (Quo's
 * "Group messages" changelog entry, 2026-06-16) — sending to exactly one is unchanged.
 *
 * `phoneNumberId` is documented as deprecated in favor of `from` (which accepts either a Quo
 * phone number id or the number itself in E.164 format), so this action exposes only `from`.
 *
 * ## Not idempotent
 *
 * Quo documents no idempotency key for sending a message — a retry sends a second message.
 * Sending to a US number requires completed US carrier registration on the workspace, per Quo's
 * own auth guide; an unregistered workspace gets a documented error rather than silent failure.
 */
interface Input {
  content: string;
  from: string;
  to: string[];
  userId?: string;
  setInboxStatus?: string;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a text message from a Quo number to up to 10 recipients (more than one " +
    "recipient sends a single group message).",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 1600 },
      hint: "The text content of the message (max 1600 characters, cannot be all whitespace).",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      placeholder: "+15555555555",
      hint: "The sending Quo phone number — either its phone number ID (PN...) or the number " +
        "itself in E.164 format.",
    },
    {
      key: "to",
      label: "To",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+15555555555" },
      hint: "Up to 10 recipient phone numbers in E.164 format. More than one sends a single " +
        "group message.",
    },
    {
      key: "userId",
      label: "Send as user",
      type: "string",
      advanced: true,
      placeholder: "US123abc",
      hint: "Attribute the message to this Quo user (must be a member of the sending phone " +
        "number). Defaults to the phone number's owner.",
    },
    {
      key: "setInboxStatus",
      label: "Set inbox status",
      type: "select",
      advanced: true,
      options: [{ value: "done", label: "Done" }],
      hint: 'Set to "done" to move the conversation straight to the Done view instead of the ' +
        "open inbox.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Message (id, to, from, text, phoneNumberId, conversationId, direction, userId, " +
        "status, createdAt, updatedAt, media)",
    },
  ],

  execute(input, ctx) {
    ctx.log("info", "sending Quo message", { from: input.from, to: input.to.length });
    return new QuoClient(ctx).json("/messages", {
      method: "POST",
      body: {
        content: input.content,
        from: input.from,
        to: input.to,
        userId: input.userId,
        setInboxStatus: input.setInboxStatus,
      },
    });
  },
};

export default messageSend;
