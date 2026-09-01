import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, paymentIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentId: string;
  from?: string;
  limit?: number;
  testmode?: boolean;
}

const paymentRefundList: ActionDefinition<Input> = {
  key: "payment-refund-list",
  type: "search",
  resource: "refund",
  title: "List Payment Refunds",
  description: "Retrieve a cursor-paginated list of refunds for one payment.",
  params: [paymentIdParam(), ...paginationParams(), testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Refunds" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      `/payments/${encodeURIComponent(input.paymentId)}/refunds`,
      compact({ from: input.from, limit: input.limit, testmode: input.testmode }),
    );
    return { count: unwrapList(body, "refunds").length, items: unwrapList(body, "refunds") };
  },
};

export default paymentRefundList;
