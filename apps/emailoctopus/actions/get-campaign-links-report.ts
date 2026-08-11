import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * `GET /campaigns/{campaign_id}/reports/links`.
 *
 * Unlike every other collection in this API, the links report is **not
 * paginated** — the response is a bare `{ data: [...] }` with no `paging`
 * envelope and no `limit` parameter, so there is nothing to page through.
 */
const getCampaignLinksReport: ActionDefinition<Input> = {
  key: "get-campaign-links-report",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Links Report",
  description:
    "Per-link click totals for a campaign — each URL with its total and unique click counts. Not paginated: the whole report comes back in one call.",
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
    {
      key: "data",
      type: "array",
      label: "One row per link: `url`, `clicked_total`, `clicked_unique`",
    },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(
      `/campaigns/${seg(input.campaignId)}/reports/links`,
    );
  },
};

export default getCampaignLinksReport;
