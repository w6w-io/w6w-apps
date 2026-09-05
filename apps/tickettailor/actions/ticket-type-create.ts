import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient, toList } from "../lib/client.ts";

/**
 * `POST /v1/event_series/{event_series_id}/ticket_types` — verified against
 * `createTicketTypeForEventSeries`, 2026-09-05. `price` and `booking_fee` are
 * in the smallest currency unit (cents/pence), matching the series' currency.
 * `discounts` is sent as a repeated `discounts[]` form field — see
 * `lib/client.ts` for why that convention, and its one caveat.
 */
interface Input {
  eventSeriesId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  bookingFee?: number;
  maxPerOrder?: number;
  minPerOrder?: number;
  discounts?: string[] | string;
  groupId?: string;
  accessCode?: string;
}

const ticketTypeCreate: ActionDefinition<Input> = {
  key: "ticket-type-create",
  type: "perform",
  resource: "ticket-type",
  title: "Create Ticket Type",
  description: "Add a new ticket type to an event series.",
  idempotent: false,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "General Admission",
    },
    {
      key: "price",
      label: "Price (smallest currency unit, e.g. cents)",
      type: "number",
      required: true,
    },
    { key: "quantity", label: "Quantity available", type: "number", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "bookingFee", label: "Booking fee (smallest currency unit)", type: "number" },
    { key: "maxPerOrder", label: "Max per order", type: "number" },
    { key: "minPerOrder", label: "Min per order", type: "number" },
    {
      key: "discounts",
      label: "Discount IDs",
      type: "string",
      hint: "Comma-separated discount IDs (di_...) to associate with this ticket type.",
    },
    { key: "groupId", label: "Ticket group ID", type: "string" },
    { key: "accessCode", label: "Access code (hides this ticket unless entered)", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Ticket type ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Price" },
    { key: "quantity", type: "number", label: "Quantity" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/ticket_types`,
      {
        method: "POST",
        form: {
          name: input.name,
          price: input.price,
          quantity: input.quantity,
          description: input.description,
          booking_fee: input.bookingFee,
          max_per_order: input.maxPerOrder,
          min_per_order: input.minPerOrder,
          discounts: toList(input.discounts),
          group_id: input.groupId,
          access_code: input.accessCode,
        },
      },
    );
  },
};

export default ticketTypeCreate;
