import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * `GET /campaigns/{campaign_id}/reports/summary`.
 *
 * The aggregate counters for one campaign. Note the shape: `bounced` splits
 * into `{ hard, soft }`, and `opened` and `clicked` each split into
 * `{ total, unique }`, while `sent`, `complained` and `unsubscribed` are plain
 * integers. Treating any of the first three as a number yields `NaN`.
 */
const getCampaignSummaryReport: ActionDefinition<Input> = {
  key: "get-campaign-summary-report",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Summary Report",
  description:
    "Aggregate counters for a campaign. `bounced` is `{hard, soft}` and `opened`/`clicked` are `{total, unique}` objects, not plain numbers.",
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "sent", type: "number", label: "Emails sent" },
    { key: "bounced", type: "object", label: "`{ hard, soft }`" },
    { key: "opened", type: "object", label: "`{ total, unique }`" },
    { key: "clicked", type: "object", label: "`{ total, unique }`" },
    { key: "complained", type: "number", label: "Spam complaints" },
    { key: "unsubscribed", type: "number", label: "Unsubscribes" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(
      `/campaigns/${seg(input.campaignId)}/reports/summary`,
    );
  },
};

export default getCampaignSummaryReport;
