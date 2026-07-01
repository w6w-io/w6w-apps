import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * Kick off delivery of a campaign. Mailchimp requires the campaign to already
 * be in `save`/`schedule` state; the API returns 204 on success.
 */
const sendCampaign: ActionDefinition<Input, { success: boolean }> = {
  key: "send-campaign",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Send a campaign to its audience.",
  // Not idempotent — sending twice would deliver twice.
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    await client.request(`/campaigns/${input.campaignId}/actions/send`, {
      method: "POST",
      body: {},
    });
    return { success: true };
  },
};

export default sendCampaign;
