import type { ActionDefinition } from "@w6w/types";
import {
  campaignConversionKey,
  LinkedInConversionsClient,
  llaPartnerConversionUrn,
  sponsoredCampaignUrn,
} from "../lib/client.ts";
import { campaignIdParam, conversionIdParam } from "../lib/params.ts";

interface Input {
  campaignId: string;
  conversionId: string;
}

/**
 * `PUT /rest/campaignConversions/(campaign:{campaignUrn},conversion:{conversionUrn})` —
 * associates a specific campaign with a Conversion Rule, so conversions
 * attributed to that campaign are counted. Only associated campaigns are
 * eligible for attribution — a Conversion Rule created without
 * `autoAssociationType` starts with none.
 *
 * A `PUT` of the same pair again is a plain re-assert of the same
 * association, not an error, so this is marked idempotent.
 */
const campaignConversionAssociate: ActionDefinition<Input> = {
  key: "campaign-conversion-associate",
  type: "perform",
  resource: "campaign-conversion",
  title: "Associate Campaign with Conversion Rule",
  description: "Associate a Campaign with a Conversion Rule so conversions can be attributed to " +
    "it. Only associated campaigns are eligible for attribution.",
  idempotent: true,
  params: [campaignIdParam, conversionIdParam],
  output: [{ key: "ok", type: "boolean", label: "Association accepted" }],

  async execute(input, ctx) {
    const campaign = sponsoredCampaignUrn(input.campaignId);
    const conversion = llaPartnerConversionUrn(input.conversionId);
    const client = new LinkedInConversionsClient(ctx);
    await client.request(
      `/rest/campaignConversions/${campaignConversionKey(campaign, conversion)}`,
      { method: "PUT", body: { campaign, conversion } },
    );
    return { ok: true };
  },
};

export default campaignConversionAssociate;
