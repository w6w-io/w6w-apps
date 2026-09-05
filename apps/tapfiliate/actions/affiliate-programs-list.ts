import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";

/** `GET /affiliates/{id}/programs/` — the programs (and per-program referral links) this affiliate belongs to. */
interface Input {
  affiliateId: string;
}

const affiliateProgramsList: ActionDefinition<Input> = {
  key: "affiliate-programs-list",
  type: "read",
  resource: "affiliate",
  title: "Get Affiliate's Programs",
  description:
    "List the programs an affiliate has applied to or joined, with their referral links.",
  params: [{ key: "affiliateId", label: "Affiliate", type: "string", required: true }],
  output: [{
    key: "items",
    type: "array",
    label: "Affiliations, each with referral_link and coupon",
  }],

  async execute(input, ctx) {
    const items = await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/programs/`,
    );
    return { items };
  },
};

export default affiliateProgramsList;
