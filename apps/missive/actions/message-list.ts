import type { ActionDefinition } from "@w6w/types";
import { MissiveClient } from "../lib/client.ts";

interface Input {
  emailMessageId: string;
}

/**
 * `GET /v1/messages?email_message_id=...` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Messages, 2026-08-29.
 *
 * Finds messages by their email `Message-ID` header. Email standards require
 * this to be unique, so usually one match comes back; a non-compliant sender
 * can produce duplicates, in which case Missive returns up to the latest 10.
 */
const action: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "Find Message By Message-ID",
  description: "Look up messages by the email Message-ID header. Usually returns one match; up " +
    "to the latest 10 if a non-compliant sender reused the same Message-ID.",
  params: [
    {
      key: "emailMessageId",
      label: "Email Message-ID",
      type: "string",
      required: true,
      hint: "The Message-ID found in an email's header.",
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Matching messages, newest first" },
  ],

  async execute(input, ctx) {
    if (!input.emailMessageId) throw new Error("`emailMessageId` is required");
    const res = await new MissiveClient(ctx).json<{ messages: unknown[] }>("/messages", {
      query: { email_message_id: input.emailMessageId },
    });
    return res.messages;
  },
};

export default action;
