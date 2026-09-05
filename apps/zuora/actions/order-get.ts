import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";

interface Input {
  orderKey: string;
}

/**
 * `GET /object-query/orders/{key}` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/queryordersbykey`.
 *
 * Uses Object Query rather than the classic `GET /v1/orders/{orderNumber}`,
 * which Zuora documents as gated behind the legacy "Order Metrics" feature —
 * see `order-list.ts`.
 */
const action: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve a specific order.",
  params: [
    { key: "orderKey", label: "Order Key", type: "string", required: true },
  ],
  output: [{ key: "order", type: "object", label: "Order" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const order = await client.request(
      `/object-query/orders/${encodeURIComponent(input.orderKey)}`,
    );
    return { order };
  },
};

export default action;
