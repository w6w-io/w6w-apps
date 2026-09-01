import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, paymentIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentId: string;
  from?: string;
  limit?: number;
  testmode?: boolean;
}

const paymentChargebackList: ActionDefinition<Input> = {
  key: "payment-chargeback-list",
  type: "search",
  resource: "chargeback",
  title: "List Payment Chargebacks",
  description: "Retrieve a cursor-paginated list of chargebacks for one payment.",
  params: [paymentIdParam(), ...paginationParams(), testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Chargebacks" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      `/payments/${encodeURIComponent(input.paymentId)}/chargebacks`,
      compact({ from: input.from, limit: input.limit, testmode: input.testmode }),
    );
    return {
      count: unwrapList(body, "chargebacks").length,
      items: unwrapList(body, "chargebacks"),
    };
  },
};

export default paymentChargebackList;
