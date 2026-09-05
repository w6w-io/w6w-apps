import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `GET /v1/orders/{order_id}` — verified against `getOrderById`, 2026-09-05.
 *
 * `event_summary.id` is documented as deprecated in favour of
 * `event_summary.event_id` (same value); both are declared in `output` so a
 * workflow already reading the deprecated field is not broken, but new
 * workflows should read `event_id`.
 */
interface Input {
  orderId: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch a single order by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true, placeholder: "or_123" },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "status_message", type: "string", label: "Status detail" },
    { key: "buyer_details", type: "object", label: "Buyer name, email, phone, address" },
    { key: "subtotal", type: "number", label: "Subtotal" },
    { key: "tax", type: "number", label: "Tax" },
    { key: "total", type: "number", label: "Total" },
    { key: "total_paid", type: "number", label: "Total paid" },
    { key: "currency", type: "string", label: "Currency" },
    {
      key: "event_summary",
      type: "object",
      label: "Event summary — use event_summary.event_id, not the deprecated .id",
    },
    { key: "issued_tickets", type: "array", label: "Issued tickets on this order" },
    { key: "sold_products", type: "array", label: "Products sold on this order" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(`/orders/${encodeURIComponent(input.orderId)}`);
  },
};

export default orderGet;
