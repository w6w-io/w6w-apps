import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import { type CampaignSendingInput, campaignSendingParams } from "../lib/params.ts";

/**
 * `POST /api/v2/campaigns` — create a campaign.
 *
 * Only `name` and `campaign_schedule` are required by the vendor. `sequences`
 * is optional at creation (a campaign can be created as a shell and given
 * steps later via `campaign-patch`), but if you do supply it, Instantly's own
 * schema note applies: "Even though this field is an array, only the first
 * element is used" — a second sequence element is silently ignored, not an
 * error.
 */
interface Input extends CampaignSendingInput {
  name: string;
  campaign_schedule: unknown;
}

const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a campaign. A schedule is required even for a campaign you plan to " +
    "launch later.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    ...campaignSendingParams().map((p) =>
      p.key === "campaign_schedule" ? { ...p, required: true } : p
    ),
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    const { name, campaign_schedule, sequences, ...rest } = input;
    ctx.log("info", "creating campaign", { name });
    return new InstantlyClient(ctx).json("/campaigns", {
      method: "POST",
      body: {
        name,
        campaign_schedule: asOptionalJson(campaign_schedule, "Campaign schedule"),
        sequences: asOptionalJson(sequences, "Sequences"),
        ...rest,
      },
    });
  },
};

export default campaignCreate;
