import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import {
  includeParam,
  pageQuery,
  paginationParams,
  subscriptionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /v1/subscriptions` — filter parameters documented: `store_id`,
 * `order_id`, `order_item_id`, `product_id`, `variant_id`, `user_email`,
 * `status`.
 */
interface Input {
  storeId?: string;
  orderId?: string;
  orderItemId?: string;
  productId?: string;
  variantId?: string;
  userEmail?: string;
  status?: string;
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description: "List subscriptions, optionally filtered by store, order, product, variant, " +
    "customer email or status.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    { key: "orderId", label: "Order ID", type: "string" },
    { key: "orderItemId", label: "Order item ID", type: "string" },
    { key: "productId", label: "Product ID", type: "string" },
    { key: "variantId", label: "Variant ID", type: "string" },
    { key: "userEmail", label: "Customer email", type: "string" },
    { key: "status", label: "Status", type: "select", options: subscriptionStatusOptions },
    includeParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Subscriptions" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/subscriptions", {
      query: {
        "filter[store_id]": input.storeId,
        "filter[order_id]": input.orderId,
        "filter[order_item_id]": input.orderItemId,
        "filter[product_id]": input.productId,
        "filter[variant_id]": input.variantId,
        "filter[user_email]": input.userEmail,
        "filter[status]": input.status,
        include: input.include,
        ...pageQuery(input),
      },
    });
  },
};

export default subscriptionList;
