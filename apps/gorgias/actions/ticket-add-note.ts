import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";

interface Input {
  ticketId: number;
  bodyText: string;
  mentionUserIds?: string;
}

/**
 * `POST /tickets/{ticket_id}/messages` with `channel: "internal-note"` —
 * verified against `CreateMessage`'s OpenAPI schema
 * (developers.gorgias.com/reference/create-ticket-message), which documents
 * `public` as "Only internal notes are private." Internal notes are never
 * sent to the customer.
 */
const ticketAddNote: ActionDefinition<Input> = {
  key: "ticket-add-note",
  type: "perform",
  resource: "ticket",
  title: "Add Internal Note",
  description: "Add a private note to a ticket, visible only to agents.",
  // Gorgias mints a new message id per call.
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "bodyText",
      label: "Note",
      type: "text",
      required: true,
      config: { multiline: true },
    },
    {
      key: "mentionUserIds",
      label: "Mention user IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated Gorgias user IDs to mention alongside the note.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Message ID" }],

  execute(input, ctx) {
    const mentionIds = unset(input.mentionUserIds)
      ?.split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    return new GorgiasClient(ctx).request(`/tickets/${input.ticketId}/messages`, {
      method: "POST",
      body: {
        channel: "internal-note",
        from_agent: true,
        public: false,
        body_text: input.bodyText,
        mention_ids: mentionIds?.length ? mentionIds : undefined,
      },
    });
  },
};

export default ticketAddNote;
