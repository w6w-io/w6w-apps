import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  /** CSV, e.g. "tiers,creator,benefits,goals". */
  include?: string;
  campaignFields?: string;
  tierFields?: string;
}

const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description:
    "Fetch a single campaign by ID (GET /campaigns/{campaign_id}). Requires the `campaigns` scope.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: tiers, creator, benefits, goals",
    },
    { key: "campaignFields", label: "Campaign fields", type: "string", hint: "CSV" },
    { key: "tierFields", label: "Tier fields", type: "string", hint: "CSV" },
  ],
  output: [
    { key: "data.id", type: "string", label: "Campaign ID" },
    { key: "data.attributes", type: "object", label: "Campaign attributes" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request(`/campaigns/${encodeURIComponent(input.campaignId)}`, {
      query: {
        include: input.include,
        "fields[campaign]": input.campaignFields,
        "fields[tier]": input.tierFields,
      },
    });
  },
};

export default getCampaign;
