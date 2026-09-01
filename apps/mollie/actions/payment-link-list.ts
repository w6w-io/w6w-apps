import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, testmodeParam } from "../lib/params.ts";

interface Input {
  from?: string;
  limit?: number;
  testmode?: boolean;
}

const paymentLinkList: ActionDefinition<Input> = {
  key: "payment-link-list",
  type: "search",
  resource: "payment-link",
  title: "List Payment Links",
  description: "Retrieve a cursor-paginated list of payment links.",
  params: [...paginationParams(), testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Payment links" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/payment-links",
      compact({ from: input.from, limit: input.limit, testmode: input.testmode }),
    );
    return {
      count: unwrapList(body, "payment_links").length,
      items: unwrapList(body, "payment_links"),
    };
  },
};

export default paymentLinkList;
