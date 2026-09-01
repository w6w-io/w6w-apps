import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Email Series Campaign",
  description: "Fetch a single Email Series Campaign by id.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<{ campaigns?: Array<Record<string, unknown>> }>(
      `/campaigns/${encodeURIComponent(input.campaignId)}`,
    );
    return body.campaigns?.[0] ?? {};
  },
};

export default getCampaign;
