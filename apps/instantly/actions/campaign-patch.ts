import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import {
  campaignIdParam,
  type CampaignSendingInput,
  campaignSendingParams,
} from "../lib/params.ts";

/**
 * `PATCH /api/v2/campaigns/{id}` — update a campaign.
 *
 * Every field is optional here (unlike Create, where `campaign_schedule` is
 * required); an omitted field keeps its current value.
 */
interface Input extends CampaignSendingInput {
  id: string;
  name?: string;
}

const campaignPatch: ActionDefinition<Input> = {
  key: "campaign-patch",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description: "Update a campaign. Only the fields you set are changed.",
  idempotent: true,
  params: [
    campaignIdParam,
    { key: "name", label: "Name", type: "string" },
    ...campaignSendingParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    const { id, campaign_schedule, sequences, ...rest } = input;
    return new InstantlyClient(ctx).json(`/campaigns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        ...rest,
        ...(campaign_schedule !== undefined
          ? { campaign_schedule: asOptionalJson(campaign_schedule, "Campaign schedule") }
          : {}),
        ...(sequences !== undefined ? { sequences: asOptionalJson(sequences, "Sequences") } : {}),
      },
    });
  },
};

export default campaignPatch;
