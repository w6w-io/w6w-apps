import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /payments/`
 *
 * The docs show no filter parameters for this endpoint — only the global
 * `?page` applies.
 */
interface Input {
  page?: number;
}

const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "List payments made from the current Payments system.",
  params: [pageParam],
  output: [
    { key: "items", type: "array", label: "Payments" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/payments/", {
      query: compact({ page: input.page }),
    });
  },
};

export default paymentList;
