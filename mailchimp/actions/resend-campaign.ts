import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * Create a "resend to non-openers" version of a sent campaign. Mailchimp's
 * endpoint (`/actions/create-resend`) generates a draft ready for review.
 */
const resendCampaign: ActionDefinition<Input> = {
  key: "resend-campaign",
  type: "perform",
  resource: "campaign",
  title: "Resend Campaign to Non-Openers",
  description: "Create a resend-to-non-openers copy of a sent campaign.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request(`/campaigns/${input.campaignId}/actions/create-resend`, {
      method: "POST",
      body: {},
    });
  },
};

export default resendCampaign;
