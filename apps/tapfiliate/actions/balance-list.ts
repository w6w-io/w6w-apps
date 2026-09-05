import type { ActionDefinition } from "@w6w/types";
import { TapfiliateClient } from "../lib/client.ts";

/** `GET /balances/` — every affiliate's non-zero balance, account-wide, not paginated. */
const balanceList: ActionDefinition<Record<string, never>> = {
  key: "balance-list",
  type: "read",
  resource: "payment",
  title: "List All Balances",
  description: "List all non-zero affiliate balances across the account.",
  params: [],
  output: [{
    key: "items",
    type: "array",
    label: "One entry per affiliate with a non-zero balance",
  }],

  async execute(_input, ctx) {
    const items = await new TapfiliateClient(ctx).json("/balances/");
    return { items };
  },
};

export default balanceList;
