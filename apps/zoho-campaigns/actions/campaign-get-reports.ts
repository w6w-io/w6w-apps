import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { campaignKey } from "../lib/params.ts";

interface Input {
  campaignKey: string;
}

interface Output {
  data: Record<string, unknown>;
}

/**
 * `GET /campaignreports` — verified against
 * `https://www.zoho.com/campaigns/help/developers/campaign-reports.html`.
 * Overlaps heavily with `campaign-get-details`'s report section, but is the
 * vendor's own dedicated reporting endpoint.
 */
const campaignGetReports: ActionDefinition<Input, Output> = {
  key: "campaign-get-reports",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Reports",
  description: "Get a campaign's report summary — reach, opens, clicks, bounces and unsubscribes.",
  params: [campaignKey],
  output: [{ key: "data", type: "object", label: "Campaign reports" }],

  async execute(input, ctx) {
    const data = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "campaignreports",
      { query: { campaignkey: input.campaignKey } },
    );
    return { data };
  },
};

export default campaignGetReports;
