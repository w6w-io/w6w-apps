import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { priorityOptions, ticketOutput, ticketStatusOptions } from "../lib/params.ts";

interface Input {
  ticketId: number;
  subject?: string;
  status?: string;
  priority?: string;
  externalId?: string;
  isUnread?: boolean;
}

/**
 * `PUT /tickets/{id}` — verified against `UpdateTicket`'s OpenAPI schema
 * (developers.gorgias.com/reference/update-ticket). Gorgias's own docs
 * (reference/requests, "Partially updating objects") say only the attributes
 * sent are changed, so every field here is optional and omitted ones are left
 * as they are — no `compact`/read-modify-write needed.
 */
const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description: "Update a ticket. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "status", label: "Status", type: "select", options: ticketStatusOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "isUnread", label: "Mark as unread", type: "boolean", advanced: true },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/tickets/${input.ticketId}`, {
      method: "PUT",
      body: {
        subject: unset(input.subject),
        status: input.status,
        priority: input.priority,
        is_unread: input.isUnread,
        external_id: unset(input.externalId),
      },
    });
  },
};

export default ticketUpdate;
