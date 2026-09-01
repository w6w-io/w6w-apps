import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /v1/settlements` — a paginated list of settlements (batch transfers to your bank account). */
interface Input {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

const settlementList: ActionDefinition<Input> = {
  key: "settlement-list",
  type: "search",
  resource: "settlement",
  title: "List Settlements",
  description:
    "Retrieve a paginated list of settlements. Each settlement is a batch transfer to your bank " +
    "account.",
  params: [...dateRangeParams(), ...paginationParams()],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Settlements" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/settlements",
      compact({ from: input.from, to: input.to, count: input.count, skip: input.skip }),
    );
  },
};

export default settlementList;
