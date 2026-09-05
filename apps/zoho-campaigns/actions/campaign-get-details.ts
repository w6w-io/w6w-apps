import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { campaignKey } from "../lib/params.ts";

interface Input {
  campaignKey: string;
  campaignType?: "normal" | "abtesting";
}

interface Output {
  data: Record<string, unknown>;
}

/**
 * `GET /getcampaigndetails` — verified against
 * `https://www.zoho.com/campaigns/help/developers/campaign-details.html`.
 * The response bundles campaign data, reach, reports and associated lists
 * into one object with no single field this app can promise ahead of time,
 * so it is returned as-is under `data`.
 */
const campaignGetDetails: ActionDefinition<Input, Output> = {
  key: "campaign-get-details",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Details",
  description: "Get a campaign's data, reach, reports and associated mailing lists.",
  params: [
    campaignKey,
    {
      key: "campaignType",
      label: "Campaign type",
      type: "select",
      options: [{ value: "normal", label: "Normal" }, { value: "abtesting", label: "A/B testing" }],
      default: "normal",
    },
  ],
  output: [{ key: "data", type: "object", label: "Campaign details" }],

  async execute(input, ctx) {
    const data = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "getcampaigndetails",
      { query: { campaignkey: input.campaignKey, campaigntype: input.campaignType } },
    );
    return { data };
  },
};

export default campaignGetDetails;
