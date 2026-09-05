import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam, pageQuery, paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/orders` — filter parameters documented: `store_id`, `user_email`,
 * `order_number`. Ordered by `created_at` descending by default.
 */
interface Input {
  storeId?: string;
  userEmail?: string;
  orderNumber?: number;
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List orders, newest first, optionally filtered by store, customer email or " +
    "order number.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    { key: "userEmail", label: "Customer email", type: "string" },
    {
      key: "orderNumber",
      label: "Order number",
      type: "number",
      validation: { integer: true },
    },
    includeParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Orders" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/orders", {
      query: {
        "filter[store_id]": input.storeId,
        "filter[user_email]": input.userEmail,
        "filter[order_number]": input.orderNumber,
        include: input.include,
        ...pageQuery(input),
      },
    });
  },
};

export default orderList;
