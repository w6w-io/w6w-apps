import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * Clone a campaign as a new draft. Returns the new campaign record so callers
 * can chain further edits.
 */
const replicateCampaign: ActionDefinition<Input> = {
  key: "replicate-campaign",
  type: "perform",
  resource: "campaign",
  title: "Replicate Campaign",
  description: "Duplicate a campaign into a new draft.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request(`/campaigns/${input.campaignId}/actions/replicate`, {
      method: "POST",
      body: {},
    });
  },
};

export default replicateCampaign;
