import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /campaigns/details` — verified against the fetched spec. */
const action: ActionDefinition = {
  key: "campaign-details-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Details",
  description: "Fetch full configuration and channel details for one campaign.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "channels", type: "array", label: "Channels" },
  ],

  async execute(input, ctx) {
    const p = input as { campaignId: string };
    return await new BrazeClient(ctx).get("/campaigns/details", { campaign_id: p.campaignId });
  },
};

export default action;
