import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/** `GET /affiliate-prospects/{?email,referral_code,program_id,group_id}` */
interface Input {
  email?: string;
  referralCode?: string;
  programId?: string;
  groupId?: string;
  page?: number;
}

const affiliateProspectList: ActionDefinition<Input> = {
  key: "affiliate-prospect-list",
  type: "search",
  resource: "affiliate-prospect",
  title: "List Affiliate Prospects",
  description:
    "List affiliate prospects — people who have signed up but not yet been promoted to full " +
    "affiliates — optionally filtered by email, referral code, program, or group.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "referralCode", label: "Referral code", type: "string" },
    { key: "programId", label: "Program", type: "string" },
    { key: "groupId", label: "Affiliate group", type: "string" },
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Affiliate prospects" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/affiliate-prospects/", {
      query: compact({
        email: input.email,
        referral_code: input.referralCode,
        program_id: input.programId,
        group_id: input.groupId,
        page: input.page,
      }),
    });
  },
};

export default affiliateProspectList;
