import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { channelOptions } from "../lib/params.ts";

interface Input {
  ticketId: number;
  channel: string;
  bodyText: string;
  bodyHtml?: string;
  receiverId?: number;
  receiverEmail?: string;
}

/**
 * `POST /tickets/{ticket_id}/messages` — verified against `CreateMessage`'s
 * OpenAPI schema (developers.gorgias.com/reference/create-ticket-message). A
 * public, customer-facing reply, sent from the company by default
 * (`from_agent: true`); Gorgias sends it asynchronously once created ("it
 * does not mean that this one has been sent because the creation and sending
 * process are decoupled").
 */
const ticketAddReply: ActionDefinition<Input> = {
  key: "ticket-add-reply",
  type: "perform",
  resource: "ticket",
  title: "Add Reply",
  description: "Send a public, customer-facing reply on a ticket.",
  // Gorgias mints a new message id per call.
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      required: true,
      default: "email",
      options: channelOptions.filter((o) => o.value !== "internal-note"),
    },
    {
      key: "bodyText",
      label: "Message",
      type: "text",
      required: true,
      config: { multiline: true },
    },
    {
      key: "bodyHtml",
      label: "Message (HTML)",
      type: "text",
      advanced: true,
      config: { multiline: true },
    },
    { key: "receiverId", label: "Receiver customer ID", type: "number", row: "receiver" },
    {
      key: "receiverEmail",
      label: "Receiver email",
      type: "string",
      row: "receiver",
      hint: "Defaults to the ticket's customer when left blank.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Message ID" }],

  execute(input, ctx) {
    const receiver = input.receiverId
      ? { id: input.receiverId }
      : unset(input.receiverEmail)
      ? { email: input.receiverEmail }
      : undefined;

    return new GorgiasClient(ctx).request(`/tickets/${input.ticketId}/messages`, {
      method: "POST",
      body: {
        channel: input.channel,
        from_agent: true,
        public: true,
        body_text: input.bodyText,
        body_html: unset(input.bodyHtml),
        receiver,
      },
    });
  },
};

export default ticketAddReply;
