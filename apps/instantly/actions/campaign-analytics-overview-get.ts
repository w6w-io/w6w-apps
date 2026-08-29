import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";
import { campaignStatusOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/campaigns/analytics/overview` — aggregate counters (opens,
 * clicks, replies, and interest-status totals) across one, several, or every
 * campaign.
 *
 * `expand_crm_events` changes what the interest-status totals count: OFF
 * (the default) counts only the FIRST time a contact reached each status, so a
 * lead that went Interested -> Meeting Booked -> Closed adds one to each of
 * those three counters; ON counts every occurrence, so the same lead could add
 * more than one to a counter it revisited. There is also a 10-minute
 * de-duplication window after any status change on a lead, during which
 * further updates do not add new analytics events — a rapid double-update
 * inside that window will not double-count either way.
 */
interface Input {
  id?: string;
  ids?: string[] | string;
  start_date?: string;
  end_date?: string;
  campaign_status?: number;
  expand_crm_events?: boolean;
}

const campaignAnalyticsOverviewGet: ActionDefinition<Input> = {
  key: "campaign-analytics-overview-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Analytics Overview",
  description: "Get aggregate engagement and interest-status totals across one, several, or " +
    "every campaign.",
  params: [
    { key: "id", label: "Campaign ID", type: "string" },
    { key: "ids", label: "Campaign IDs", type: "array", item: { type: "string" } },
    { key: "start_date", label: "Start date", type: "string", placeholder: "2026-01-01" },
    { key: "end_date", label: "End date", type: "string", placeholder: "2026-01-31" },
    {
      key: "campaign_status",
      label: "Campaign status",
      type: "select",
      options: campaignStatusOptions,
    },
    {
      key: "expand_crm_events",
      label: "Count every interest-status change, not just the first",
      type: "boolean",
      hint: "Off (default): each interest-status total counts a contact once, at its first " +
        "occurrence. On: every occurrence counts, so one lead's path through several statuses " +
        "can add to more than one total.",
    },
  ],
  output: [
    { key: "open_count_unique", type: "number", label: "Unique opens" },
    { key: "reply_count", type: "number", label: "Replies" },
    { key: "link_click_count_unique", type: "number", label: "Unique link clicks" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/campaigns/analytics/overview", {
      query: {
        id: input.id,
        ids: toList(input.ids),
        start_date: input.start_date,
        end_date: input.end_date,
        campaign_status: input.campaign_status,
        expand_crm_events: input.expand_crm_events,
      },
    });
  },
};

export default campaignAnalyticsOverviewGet;
