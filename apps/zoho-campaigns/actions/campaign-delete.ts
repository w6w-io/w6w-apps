import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { campaignKey } from "../lib/params.ts";

interface Input {
  campaignKey: string;
}

interface Output {
  message?: string;
}

/**
 * `GET /deletecampaign` — verified against
 * `https://www.zoho.com/campaigns/help/developers/delete-campaign.html`.
 */
const campaignDelete: ActionDefinition<Input, Output> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Delete a campaign.",
  idempotent: true,
  params: [campaignKey],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "deletecampaign",
      { query: { campaignkey: input.campaignKey } },
    );
    return { message: body.message };
  },
};

export default campaignDelete;
