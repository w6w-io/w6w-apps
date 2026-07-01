import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  campaignId: string;
  fieldsCampaign?: string;
  include?: string;
}

const getCampaign: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Retrieve a single campaign by ID.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    { key: "fieldsCampaign", label: "Campaign fields", type: "string" },
    { key: "include", label: "Include", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/campaigns/${input.campaignId}/`, {
      query: {
        "fields[campaign]": input.fieldsCampaign,
        include: input.include,
      },
    });
  },
};

export default getCampaign;
