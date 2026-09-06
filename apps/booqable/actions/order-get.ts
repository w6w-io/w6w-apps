import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  orderId: string;
  include?: string;
}

/** `GET /orders/{id}` — verified against developers.booqable.com ("Fetch an order"). */
const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch a single order by id.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      ...includeParam,
      placeholder: "customer,lines,payments",
      hint: includeParam.hint +
        " Valid names: barcode, coupon, customer, merge_suggestion_customer, payment_methods, " +
        "properties, documents, lines, notes, order_delivery_rate, payments, start_location, " +
        "stop_location, tax_region, tax_values.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The Order object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/orders/${input.orderId}`, {
      query: { include: input.include },
    });
  },
};

export default orderGet;
