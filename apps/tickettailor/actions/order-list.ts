import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/orders` — verified against `getAllOrders`, 2026-09-05. */
interface Input {
  name?: string;
  email?: string;
  txnId?: string;
  barcode?: string;
  eventId?: string;
  eventSeriesId?: string;
  status?: "completed" | "pending" | "canceled";
  storeId?: string;
  referralTag?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders belonging to the box office, paginated.",
  params: [
    { key: "name", label: "Buyer name contains", type: "string" },
    { key: "email", label: "Buyer email", type: "string" },
    { key: "txnId", label: "Transaction ID", type: "string" },
    { key: "barcode", label: "Ticket barcode", type: "string" },
    { key: "eventId", label: "Event ID (comma-separated)", type: "string" },
    { key: "eventSeriesId", label: "Event Series ID (comma-separated)", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Completed", value: "completed" },
        { label: "Pending", value: "pending" },
        { label: "Canceled", value: "canceled" },
      ],
    },
    { key: "storeId", label: "Store ID", type: "string", placeholder: "st_123" },
    { key: "referralTag", label: "Referral tag", type: "string" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "startingAfter", label: "Starting after (cursor)", type: "string" },
    { key: "endingBefore", label: "Ending before (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Orders" },
    { key: "links", type: "object", label: "Pagination links" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/orders", {
      query: {
        name: input.name,
        email: input.email,
        txn_id: input.txnId,
        barcode: input.barcode,
        event_id: input.eventId,
        event_series_id: input.eventSeriesId,
        status: input.status,
        store_id: input.storeId,
        referral_tag: input.referralTag,
        limit: input.limit,
        starting_after: input.startingAfter,
        ending_before: input.endingBefore,
      },
    });
  },
};

export default orderList;
