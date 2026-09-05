import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { programIdParam } from "../lib/params.ts";

/** `POST /programs/{program_id}/affiliates/` */
interface Input {
  programId: string;
  affiliateId: string;
  approved?: boolean;
  coupon?: string;
}

const programAffiliateAdd: ActionDefinition<Input> = {
  key: "program-affiliate-add",
  type: "perform",
  resource: "program",
  title: "Add Affiliate to Program",
  description:
    "Add an existing affiliate to a program, optionally pre-approved and/or with a coupon.",
  idempotent: false,
  params: [
    programIdParam,
    { key: "affiliateId", label: "Affiliate", type: "string", required: true },
    {
      key: "approved",
      label: "Approved",
      type: "boolean",
      hint:
        "Leave unset for pending. true = approved (also the vendor's own default), false = disapproved.",
    },
    { key: "coupon", label: "Coupon", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Affiliate id" },
    { key: "approved", type: "boolean", label: "Resulting approval state" },
    { key: "referral_link", type: "object", label: "The affiliate's link for this program" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/programs/${encodeId(input.programId)}/affiliates/`,
      {
        method: "POST",
        body: compact({
          affiliate: { id: input.affiliateId },
          approved: input.approved,
          coupon: input.coupon,
        }),
      },
    );
  },
};

export default programAffiliateAdd;
