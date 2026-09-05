import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { licenseKeyStatusOptions, pageQuery, paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/license-keys` — filter parameters documented: `store_id`,
 * `order_id`, `order_item_id`, `product_id`, `status`.
 */
interface Input {
  storeId?: string;
  orderId?: string;
  orderItemId?: string;
  productId?: string;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

const licenseKeyList: ActionDefinition<Input> = {
  key: "license-key-list",
  type: "search",
  resource: "license-key",
  title: "List License Keys",
  description: "List license keys, optionally filtered by store, order, product or status.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    { key: "orderId", label: "Order ID", type: "string" },
    { key: "orderItemId", label: "Order item ID", type: "string" },
    { key: "productId", label: "Product ID", type: "string" },
    { key: "status", label: "Status", type: "select", options: licenseKeyStatusOptions },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "License keys" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/license-keys", {
      query: {
        "filter[store_id]": input.storeId,
        "filter[order_id]": input.orderId,
        "filter[order_item_id]": input.orderItemId,
        "filter[product_id]": input.productId,
        "filter[status]": input.status,
        ...pageQuery(input),
      },
    });
  },
};

export default licenseKeyList;
