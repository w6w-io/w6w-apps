import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { pagingParams } from "../lib/params.ts";

const STATUS_OPTIONS = [
  "all",
  "all campaigns",
  "drafts",
  "scheduled",
  "inprogress",
  "sent",
  "stopped",
  "canceled",
  "tobereviewed",
  "reviewed",
  "paused",
  "intesting",
];

interface Input {
  sort?: "asc" | "desc";
  fromindex?: number;
  range?: number;
  status?: string;
}

interface Output {
  campaigns: Array<Record<string, unknown>>;
}

/**
 * `GET /recentcampaigns` — verified against
 * `https://www.zoho.com/campaigns/help/developers/recent-campaign.html`.
 * The vendor's own sample JSON response uses `recent_campaigns`, while the
 * XML sample's element is `recent-campaigns` — this action reads the JSON
 * key since it only ever requests JSON.
 */
const campaignListRecent: ActionDefinition<Input, Output> = {
  key: "campaign-list-recent",
  type: "read",
  resource: "campaign",
  title: "List Recent Campaigns",
  description: "List campaigns, optionally filtered by status.",
  params: [
    ...pagingParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS.map((value) => ({ value, label: value })),
      hint: "Leave unset to list every status.",
    },
  ],
  output: [{ key: "campaigns", type: "array", label: "Campaigns" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { recent_campaigns?: Array<Record<string, unknown>> }
    >("recentcampaigns", {
      query: {
        sort: input.sort,
        fromindex: input.fromindex,
        range: input.range,
        status: input.status,
      },
    });
    return { campaigns: body.recent_campaigns ?? [] };
  },
};

export default campaignListRecent;
