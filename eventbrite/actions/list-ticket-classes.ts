import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  eventId: string;
  forSale?: boolean;
  pageSize?: number;
  continuation?: string;
}

const listTicketClasses: ActionDefinition<Input> = {
  key: "list-ticket-classes",
  type: "read",
  resource: "ticket_class",
  title: "List Ticket Classes",
  description: "List ticket classes for an event.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "forSale",
      label: "Only currently for sale",
      type: "boolean",
      default: false,
      hint: "Uses /ticket_classes/for_sale/ when true.",
    },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "ticket_classes", type: "array", label: "Ticket classes" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const path = input.forSale
      ? `/events/${input.eventId}/ticket_classes/for_sale/`
      : `/events/${input.eventId}/ticket_classes/`;
    return client.request<EventbriteListResponse<"ticket_classes">>(path, {
      query: {
        page_size: input.pageSize ?? 100,
        continuation: input.continuation,
      },
    });
  },
};

export default listTicketClasses;
