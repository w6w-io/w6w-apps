import type { ActionDefinition } from "@w6w/types";
import { unwrapEnvelope, ZohoCampaignsClient } from "../lib/client.ts";
import { campaignKey } from "../lib/params.ts";

interface Input {
  campaignKey: string;
}

interface Output {
  message?: string;
  campaignStatus?: string;
}

/**
 * `POST /sendcampaign` — verified against
 * `https://www.zoho.com/campaigns/help/developers/send-campaign.html`. Sends
 * a campaign immediately; `campaign-schedule` is the equivalent for a future
 * send time (the same underlying endpoint with `isschedule=true`).
 *
 * This endpoint's own sample response nests its payload under a `"response"`
 * key, unlike `campaign-schedule`'s identical-looking one which does not —
 * see `lib/client.ts`'s module doc; `unwrapEnvelope` reads either shape.
 */
const campaignSend: ActionDefinition<Input, Output> = {
  key: "campaign-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Send a campaign to its recipients immediately.",
  idempotent: false,
  params: [campaignKey],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "campaignStatus", type: "string", label: "Campaign status" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "sendcampaign",
      { method: "POST", query: { campaignkey: input.campaignKey } },
    );
    const envelope = unwrapEnvelope<{ message?: string; campaign_status?: string }>(body);
    return { message: envelope.message, campaignStatus: envelope.campaign_status };
  },
};

export default campaignSend;
