import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/disputes` — a list of payment disputes (chargebacks). */
interface Input {
  count?: number;
  skip?: number;
}

const disputeList: ActionDefinition<Input> = {
  key: "dispute-list",
  type: "search",
  resource: "dispute",
  title: "List Disputes",
  description: "Retrieve a list of all payment disputes.",
  params: paginationParams(),
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Disputes" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/disputes",
      compact({ count: input.count, skip: input.skip }),
    );
  },
};

export default disputeList;
