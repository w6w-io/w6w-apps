import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch a single campaign by ID.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request(`/campaigns/${input.campaignId}`);
  },
};

export default getCampaign;
