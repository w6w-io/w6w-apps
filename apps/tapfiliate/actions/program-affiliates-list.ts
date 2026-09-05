import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { pageParam, programIdParam } from "../lib/params.ts";

/**
 * `GET /programs/{program_id}/affiliates/{?source_id,email,parent_id,affiliate_group_id}`
 *
 * The docs note that, as of V1.6, this endpoint returns affiliates regardless
 * of approval state — before V1.6 it silently omitted unapproved ones.
 */
interface Input {
  programId: string;
  sourceId?: string;
  email?: string;
  parentId?: string;
  affiliateGroupId?: string;
  page?: number;
}

const programAffiliatesList: ActionDefinition<Input> = {
  key: "program-affiliates-list",
  type: "search",
  resource: "program",
  title: "List Program Affiliates",
  description:
    "List the affiliates in a program, including their program-specific referral link and coupon.",
  params: [
    programIdParam,
    { key: "sourceId", label: "Source id", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "parentId", label: "Parent affiliate", type: "string" },
    { key: "affiliateGroupId", label: "Affiliate group", type: "string" },
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Affiliates in the program" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list(
      `/programs/${encodeId(input.programId)}/affiliates/`,
      {
        query: compact({
          source_id: input.sourceId,
          email: input.email,
          parent_id: input.parentId,
          affiliate_group_id: input.affiliateGroupId,
          page: input.page,
        }),
      },
    );
  },
};

export default programAffiliatesList;
