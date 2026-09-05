import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam, programIdParam } from "../lib/params.ts";

/** `PUT /programs/{program_id}/affiliates/{affiliate_id}/approved/` */
interface Input {
  programId: string;
  affiliateId: string;
}

const programAffiliateApprove: ActionDefinition<Input> = {
  key: "program-affiliate-approve",
  type: "perform",
  resource: "program",
  title: "Approve Affiliate for Program",
  description: "Approve an affiliate's application to a program.",
  idempotent: true,
  params: [programIdParam, affiliateIdParam],
  output: [
    { key: "id", type: "string", label: "Affiliate id" },
    { key: "approved", type: "boolean", label: "true" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/programs/${encodeId(input.programId)}/affiliates/${encodeId(input.affiliateId)}/approved/`,
      { method: "PUT" },
    );
  },
};

export default programAffiliateApprove;
