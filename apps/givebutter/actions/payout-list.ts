import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const payoutList: ActionDefinition<Input> = {
  key: "payout-list",
  type: "read",
  resource: "payout",
  title: "List Payouts",
  description: "List payouts to the connected account's bank account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Payouts" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/payouts", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default payoutList;
