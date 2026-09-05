import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";

interface Input {
  limit: number;
}

interface Output {
  campaigns: Array<Record<string, unknown>>;
}

/**
 * `GET /recentsentcampaigns` — verified against
 * `https://www.zoho.com/campaigns/help/developers/recently-sent-campaign.html`.
 * `limit` is the one mandatory parameter this endpoint documents.
 */
const campaignListRecentlySent: ActionDefinition<Input, Output> = {
  key: "campaign-list-recently-sent",
  type: "read",
  resource: "campaign",
  title: "List Recently Sent Campaigns",
  description: "List the most recently sent campaigns.",
  params: [
    { key: "limit", label: "Limit", type: "number", required: true, default: 5 },
  ],
  output: [{ key: "campaigns", type: "array", label: "Campaigns" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { recent_sent_campaigns?: Array<Record<string, unknown>> }
    >("recentsentcampaigns", { query: { limit: input.limit } });
    return { campaigns: body.recent_sent_campaigns ?? [] };
  },
};

export default campaignListRecentlySent;
