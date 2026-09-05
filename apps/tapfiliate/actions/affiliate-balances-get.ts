import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/**
 * `GET /affiliates/{affiliate_id}/balances/`
 *
 * Response is a currency -> amount map, e.g. `{"USD": 5, "EUR": 35}` — not an
 * array, and not wrapped. A negative value means the affiliate owes a
 * (previously overpaid) balance back.
 */
interface Input {
  affiliateId: string;
}

const affiliateBalancesGet: ActionDefinition<Input> = {
  key: "affiliate-balances-get",
  type: "read",
  resource: "affiliate",
  title: "Get Affiliate Balances",
  description: "Fetch an affiliate's outstanding balances, one amount per currency.",
  params: [affiliateIdParam],
  output: [{ key: "balances", type: "object", label: "Currency code -> amount" }],

  async execute(input, ctx) {
    const balances = await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/balances/`,
    );
    return { balances };
  },
};

export default affiliateBalancesGet;
