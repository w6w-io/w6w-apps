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
 * `DELETE /rest/campaignConversions/(campaign:{campaignUrn},conversion:{conversionUrn})` —
 * removes the association between a Campaign and a Conversion Rule. This
 * does not delete the Conversion Rule itself, only stops that campaign from
 * being credited for future conversions on it.
 *
 * Not marked idempotent: a repeat delete of an already-removed association
 * is a caller-visible failure (not confirmed as a silent no-op in the
 * docs), the same reasoning `linkedin-ads`'s `audience-segment-delete` uses.
 */
const campaignConversionDelete: ActionDefinition<Input> = {
  key: "campaign-conversion-delete",
  type: "perform",
  resource: "campaign-conversion",
  title: "Remove Campaign / Conversion Rule Association",
  description: "Remove the association between a Campaign and a Conversion Rule. Does not " +
    "delete the Conversion Rule.",
  idempotent: false,
  params: [campaignIdParam, conversionIdParam],
  output: [{ key: "ok", type: "boolean", label: "Delete accepted" }],

  async execute(input, ctx) {
    const campaign = sponsoredCampaignUrn(input.campaignId);
    const conversion = llaPartnerConversionUrn(input.conversionId);
    const client = new LinkedInConversionsClient(ctx);
    await client.request(
      `/rest/campaignConversions/${campaignConversionKey(campaign, conversion)}`,
      { method: "DELETE" },
    );
    return { ok: true };
  },
};

export default campaignConversionDelete;
