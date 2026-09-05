import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import { compact, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  payment_status?: string;
  page?: number;
  per_page?: number;
  order?: string;
}

/**
 * `GET /api/v1/purchases` — event ticket purchases (a purchase groups the
 * tickets bought in one checkout).
 *
 * "Purchase filters": `payment_status` accepts `succeeded`, `pending`,
 * `failed` or `refunded`, and "defaults to `succeeded` if any invalid value
 * is passed."
 */
const purchaseList: ActionDefinition<Input> = {
  key: "purchase-list",
  type: "search",
  resource: "purchase",
  title: "List Event Ticket Purchases",
  description: "List event ticket purchases on the connected Donorbox organization.",
  params: [
    {
      key: "payment_status",
      label: "Payment status",
      type: "select",
      default: "succeeded",
      options: [
        { value: "succeeded", label: "Succeeded" },
        { value: "pending", label: "Pending" },
        { value: "failed", label: "Failed" },
        { value: "refunded", label: "Refunded" },
      ],
      hint: "Donorbox falls back to `succeeded` if an invalid value is sent.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Purchases" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/purchases", {
      query: compact({ payment_status: input.payment_status, ...paginationQuery(input) }),
    });
    return { data };
  },
};

export default purchaseList;
