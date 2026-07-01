import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * Sends a campaign by kicking off a campaign-send-job. Returns 202 Accepted
 * with the job resource — the actual send happens asynchronously.
 */
const sendCampaign: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "send-campaign",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Trigger send of a campaign that's already been finalised.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/campaign-send-jobs/`, {
      method: "POST",
      body: {
        data: {
          type: "campaign-send-job",
          id: input.campaignId,
        },
      },
    });
  },
};

export default sendCampaign;
