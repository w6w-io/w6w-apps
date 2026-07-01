import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

const deleteCampaign: ActionDefinition<Input, { success: boolean }> = {
  key: "delete-campaign",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Permanently delete a campaign.",
  idempotent: true,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    await client.request(`/campaigns/${input.campaignId}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deleteCampaign;
