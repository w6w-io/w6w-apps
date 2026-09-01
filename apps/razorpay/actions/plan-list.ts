import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/plans` — a paginated list of billing plans. */
interface Input {
  count?: number;
  skip?: number;
}

const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "Retrieve all billing plans.",
  params: paginationParams(),
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Plans" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/plans",
      compact({ count: input.count, skip: input.skip }),
    );
  },
};

export default planList;
