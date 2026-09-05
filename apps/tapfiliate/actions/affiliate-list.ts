import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/** `GET /affiliates/{?click_id,source_id,email,referral_code,parent_id,affiliate_group_id}` */
interface Input {
  clickId?: string;
  sourceId?: string;
  email?: string;
  referralCode?: string;
  parentId?: string;
  affiliateGroupId?: string;
  page?: number;
}

const affiliateList: ActionDefinition<Input> = {
  key: "affiliate-list",
  type: "search",
  resource: "affiliate",
  title: "List Affiliates",
  description:
    "List affiliates, optionally filtered by click, source, email, referral code, parent, or group.",
  params: [
    { key: "clickId", label: "Click id", type: "string" },
    { key: "sourceId", label: "Source id", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "referralCode", label: "Referral code", type: "string" },
    {
      key: "parentId",
      label: "Parent affiliate",
      type: "string",
      hint: "Retrieves the children of this MLM parent affiliate.",
    },
    { key: "affiliateGroupId", label: "Affiliate group", type: "string" },
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Affiliates" },
    { key: "nextPage", type: "number", label: "Next page number, if more results exist" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).list("/affiliates/", {
      query: compact({
        click_id: input.clickId,
        source_id: input.sourceId,
        email: input.email,
        referral_code: input.referralCode,
        parent_id: input.parentId,
        affiliate_group_id: input.affiliateGroupId,
        page: input.page,
      }),
    });
  },
};

export default affiliateList;
