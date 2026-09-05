import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/** `GET /affiliates/{affiliate_id}/payments/` — from the current "Payments" system (rolled out 2019), not the legacy "Payouts". */
interface Input {
  affiliateId: string;
}

const affiliatePaymentsList: ActionDefinition<Input> = {
  key: "affiliate-payments-list",
  type: "read",
  resource: "affiliate",
  title: "List Affiliate Payments",
  description: "List payments made to a single affiliate.",
  params: [affiliateIdParam],
  output: [{ key: "items", type: "array", label: "Payments" }],

  async execute(input, ctx) {
    const items = await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/payments/`,
    );
    return { items };
  },
};

export default affiliatePaymentsList;
