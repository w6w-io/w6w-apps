import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams, timestampFilterParams, timestampFilterQuery } from "../lib/params.ts";

interface Input {
  addressId?: string;
  customerId?: string;
  chargeId?: string;
  externalOrderId?: string;
  status?: string;
  type?: string;
  purchaseItemId?: string;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /orders` — list orders. Scope: `read_orders`.
 * Response envelope: `{"orders": [...], "next_cursor", "previous_cursor"}`.
 */
const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "Return a list of orders.",
  params: [
    { key: "addressId", label: "Address ID", type: "string" },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "chargeId", label: "Charge ID", type: "string" },
    { key: "externalOrderId", label: "External order ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "success", label: "Success" },
        { value: "queued", label: "Queued" },
        { value: "error", label: "Error" },
        { value: "refunded", label: "Refunded" },
        { value: "skipped", label: "Skipped" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "checkout", label: "Checkout" },
        { value: "recurring", label: "Recurring" },
      ],
    },
    { key: "purchaseItemId", label: "Subscription or onetime ID", type: "string" },
    ...paginationParams(50),
    ...timestampFilterParams("Order"),
  ],
  output: [
    { key: "items", type: "array", label: "Orders" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/orders", "orders", {
      query: compact({
        address_id: input.addressId,
        customer_id: input.customerId,
        charge_id: input.chargeId,
        external_order_id: input.externalOrderId,
        status: input.status,
        type: input.type,
        purchase_item_id: input.purchaseItemId,
        limit: input.limit,
        cursor: input.cursor,
        ...timestampFilterQuery(input),
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default orderList;
