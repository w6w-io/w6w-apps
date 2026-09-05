import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/event_series/{event_series_id}/ticket_types/{ticket_type_id}` —
 * verified against `updateTicketTypeById`, 2026-09-05. `modify_quantity` is
 * the vendor's own relative-adjustment field: a signed delta string
 * (`"+10"`/`"-5"`) added to or subtracted from the current quantity, distinct
 * from setting `quantity` outright (not exposed by this action — the create
 * endpoint's `quantity` field does not appear in the update schema at all).
 */
interface Input {
  eventSeriesId: string;
  ticketTypeId: string;
  name?: string;
  price?: number;
  description?: string;
  bookingFee?: number;
  maxPerOrder?: number;
  minPerOrder?: number;
  modifyQuantity?: string;
  status?: "on_sale" | "sold_out" | "unavailable" | "hidden" | "admin_only" | "locked";
}

const ticketTypeUpdate: ActionDefinition<Input> = {
  key: "ticket-type-update",
  type: "perform",
  resource: "ticket-type",
  title: "Update Ticket Type",
  description: "Update an existing ticket type's fields.",
  idempotent: true,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    {
      key: "ticketTypeId",
      label: "Ticket Type ID",
      type: "string",
      required: true,
      placeholder: "tt_123",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "price", label: "Price (smallest currency unit)", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "bookingFee", label: "Booking fee (smallest currency unit)", type: "number" },
    { key: "maxPerOrder", label: "Max per order", type: "number" },
    { key: "minPerOrder", label: "Min per order", type: "number" },
    {
      key: "modifyQuantity",
      label: "Adjust quantity by",
      type: "string",
      hint: 'Signed delta, e.g. "+10" or "-5". Added to or subtracted from the current quantity.',
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "On sale", value: "on_sale" },
        { label: "Sold out", value: "sold_out" },
        { label: "Unavailable", value: "unavailable" },
        { label: "Hidden", value: "hidden" },
        { label: "Admin only", value: "admin_only" },
        { label: "Locked", value: "locked" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Ticket type ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/ticket_types/${
        encodeURIComponent(input.ticketTypeId)
      }`,
      {
        method: "POST",
        form: {
          name: input.name,
          price: input.price,
          description: input.description,
          booking_fee: input.bookingFee,
          max_per_order: input.maxPerOrder,
          min_per_order: input.minPerOrder,
          modify_quantity: input.modifyQuantity,
          status: input.status,
        },
      },
    );
  },
};

export default ticketTypeUpdate;
